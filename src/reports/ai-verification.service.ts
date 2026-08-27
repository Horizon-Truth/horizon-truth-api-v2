import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportAiVerification } from './entities/report-ai-verification.entity';
import {
  AiVerificationClient,
  AiVerificationError,
} from './ai-verification.client';
import { deriveVerificationClaim } from './ai-claim.util';
import { AiVerificationStatus } from '../shared/enums/ai-verification-status.enum';

/**
 * Owns the AI verification lifecycle: derive a claim, record the attempt, call
 * the AI, persist the outcome.
 *
 * The external call runs detached from the request that triggered it, so
 * submitting a report never waits on the AI and never fails because of it. The
 * project has no job queue, so "detached" here means an unawaited promise
 * guarded by an in-process in-flight set — the simplest thing that satisfies the
 * lifecycle without adding infrastructure.
 */

/** A newer attempt within this window reuses the running one instead of re-calling. */
const IN_PROGRESS_REUSE_MS = 2 * 60 * 1000;

/** Debounces double-clicks and duplicate submits on "verify again". */
const REVERIFY_COOLDOWN_MS = 30 * 1000;

/** A PROCESSING row older than this was orphaned by a restart. */
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export interface RequestVerificationOptions {
  /** Set by an explicit "run again" action; ignored while an attempt is running. */
  force?: boolean;
  requestedById?: string;
}

@Injectable()
export class AiVerificationService {
  private readonly logger = new Logger(AiVerificationService.name);

  /** Report ids with a detached call in flight in this process. */
  private readonly inFlight = new Set<string>();

  constructor(
    @InjectRepository(ReportAiVerification)
    private readonly verificationRepository: Repository<ReportAiVerification>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly client: AiVerificationClient,
  ) {}

  /** The current result for a report, or null when it was never analysed. */
  async findLatestForReport(
    reportId: string,
  ): Promise<ReportAiVerification | null> {
    return this.verificationRepository.findOne({
      where: { reportId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Full attempt history, newest first — moderator/audit view. */
  async findHistoryForReport(
    reportId: string,
  ): Promise<ReportAiVerification[]> {
    return this.verificationRepository.find({
      where: { reportId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Called from report creation. Records a PENDING attempt and starts the AI
   * call in the background. Never throws: a failure here must not roll back or
   * fail the report the community just submitted.
   */
  async scheduleForReport(
    report: Report,
  ): Promise<ReportAiVerification | null> {
    try {
      const attempt = await this.createAttempt(report);
      this.runDetached(attempt.id, report.id);
      return attempt;
    } catch (error) {
      this.logger.error(
        `Could not schedule AI verification for report ${report.id}: ${(error as Error)?.message}`,
      );
      return null;
    }
  }

  /**
   * Handles an explicit verification request from the report page.
   *
   * Returns the existing result untouched unless `force` is set, so a page
   * refresh (or a client that re-requests on mount) never triggers a new
   * external call.
   */
  async requestVerification(
    reportId: string,
    options: RequestVerificationOptions = {},
  ): Promise<ReportAiVerification> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');

    const latest = await this.findLatestForReport(reportId);

    if (latest && this.isRunning(latest)) {
      // Something is already analysing this claim; hand back the same attempt.
      return latest;
    }

    if (latest && !options.force) {
      // Idempotent path: a completed (or recently failed) result already exists.
      return latest;
    }

    if (latest && options.force && this.isWithinCooldown(latest)) {
      return latest;
    }

    const attempt = await this.createAttempt(report, options.requestedById);
    this.runDetached(attempt.id, reportId);
    return attempt;
  }

  /**
   * Runs one attempt end to end. Exposed (rather than private) so tests and any
   * future worker can drive an attempt synchronously.
   */
  async processAttempt(
    attemptId: string,
  ): Promise<ReportAiVerification | null> {
    const attempt = await this.verificationRepository.findOne({
      where: { id: attemptId },
    });
    if (!attempt) return null;

    // Guard against a second runner picking up an attempt already in progress.
    if (attempt.status !== AiVerificationStatus.PENDING) return attempt;

    attempt.status = AiVerificationStatus.PROCESSING;
    await this.verificationRepository.save(attempt);

    try {
      const result = await this.client.detect(attempt.claim);

      attempt.status = AiVerificationStatus.COMPLETED;
      attempt.verdict = result.verdict;
      attempt.confidence = result.confidence;
      attempt.reasoning = result.reasoning;
      attempt.evidenceSummary = result.evidenceSummary;
      attempt.sources = result.sources;
      attempt.errorMessage = undefined;
      attempt.completedAt = new Date();
    } catch (error) {
      attempt.status = AiVerificationStatus.FAILED;
      attempt.completedAt = new Date();
      attempt.errorMessage =
        error instanceof AiVerificationError
          ? error.message
          : 'AI verification could not be completed.';

      this.logger.warn(
        `AI verification failed for report ${attempt.reportId}: ${
          error instanceof AiVerificationError
            ? `${error.reason} — ${error.message}`
            : 'unexpected error'
        }`,
      );
    }

    return this.verificationRepository.save(attempt);
  }

  private async createAttempt(
    report: Report,
    requestedById?: string,
  ): Promise<ReportAiVerification> {
    const claim = deriveVerificationClaim(report);

    const attempt = this.verificationRepository.create({
      reportId: report.id,
      claim,
      status: AiVerificationStatus.PENDING,
      provider: this.client.provider,
      requestedById,
    });

    return this.verificationRepository.save(attempt);
  }

  /**
   * Starts the attempt without blocking the caller's request. Errors are logged
   * and swallowed — `processAttempt` already persists failure state.
   */
  private runDetached(attemptId: string, reportId: string): void {
    if (this.inFlight.has(reportId)) return;
    this.inFlight.add(reportId);

    setImmediate(() => {
      void this.processAttempt(attemptId)
        .catch((error) => {
          this.logger.error(
            `Unhandled AI verification error for report ${reportId}: ${(error as Error)?.message}`,
          );
        })
        .finally(() => {
          this.inFlight.delete(reportId);
        });
    });
  }

  /** PENDING/PROCESSING and recent enough that a runner is plausibly still on it. */
  private isRunning(attempt: ReportAiVerification): boolean {
    if (attempt.status === AiVerificationStatus.PENDING) {
      return this.ageMs(attempt) < IN_PROGRESS_REUSE_MS;
    }
    if (attempt.status === AiVerificationStatus.PROCESSING) {
      // Older than this and the process that owned it is gone; allow a retry.
      return this.ageMs(attempt) < STALE_PROCESSING_MS;
    }
    return false;
  }

  private isWithinCooldown(attempt: ReportAiVerification): boolean {
    return this.ageMs(attempt) < REVERIFY_COOLDOWN_MS;
  }

  private ageMs(attempt: ReportAiVerification): number {
    const timestamp = attempt.updatedAt ?? attempt.createdAt;
    const started =
      timestamp instanceof Date
        ? timestamp.getTime()
        : new Date(timestamp).getTime();
    if (!Number.isFinite(started)) return Number.MAX_SAFE_INTEGER;
    return Date.now() - started;
  }
}
