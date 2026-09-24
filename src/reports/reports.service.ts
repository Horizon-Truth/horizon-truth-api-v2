import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { ReportVerification } from './entities/report-verification.entity';
import { ReportEvidence } from './entities/report-evidence.entity';
import { ReportAiVerification } from './entities/report-ai-verification.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AiVerificationService } from './ai-verification.service';
import { ReportStatus } from '../shared/enums/report-status.enum';
import { User } from '../users/entities/user.entity';

/**
 * Statuses a moderator has taken out of circulation. Everyone else sees every
 * other report, including unreviewed ones, so the community can verify them.
 */
export const PUBLICLY_HIDDEN_REPORT_STATUSES: ReportStatus[] = [
  ReportStatus.REJECTED,
  ReportStatus.ARCHIVED,
  ReportStatus.DUPLICATE,
];

/** The only user fields a report response may carry — never email, phone or API key. */
const PUBLIC_USER_FIELDS = ['id', 'fullName', 'username', 'role'] as const;

type PublicUser = Pick<User, (typeof PUBLIC_USER_FIELDS)[number]>;

function toPublicUser(user: User | null | undefined): PublicUser | null {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
  };
}

export interface ReportVisibility {
  /** Staff see reports in every status; the public does not. */
  includeHidden?: boolean;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportTag)
    private readonly reportTagRepository: Repository<ReportTag>,
    @InjectRepository(ReportVerification)
    private readonly reportVerificationRepository: Repository<ReportVerification>,
    @InjectRepository(ReportEvidence)
    private readonly reportEvidenceRepository: Repository<ReportEvidence>,
    private readonly auditLogsService: AuditLogsService,
    private readonly aiVerificationService: AiVerificationService,
  ) {}

  async create(
    createDto: CreateReportDto,
    reporterId: string,
  ): Promise<Report> {
    const { tagIds, ...reportData } = createDto;
    const report = this.reportRepository.create({
      ...reportData,
      reporterId,
      reason: reportData.reason || reportData.category || 'Other',
    });

    const duplicates = await this.findPotentialDuplicates(reportData);
    if (duplicates.length > 0) {
      const primaryDuplicate = duplicates[0];
      report.isDuplicate = true;
      report.duplicateOfId = primaryDuplicate.id;
      report.status = ReportStatus.NEEDS_COMMUNITY_REVIEW;
    }

    if (tagIds && tagIds.length > 0) {
      const tags = await this.reportTagRepository.findBy({
        id: In(tagIds),
      });
      report.tags = tags;
    }

    const savedReport = await this.reportRepository.save(report);
    await this.auditLogsService.createLog({
      userId: reporterId,
      action: 'created',
      entityType: 'Report',
      entityId: savedReport.id,
      metadata: {
        status: savedReport.status,
        duplicateOfId: savedReport.duplicateOfId,
      },
    });

    // Kicks off AI verification in the background. Scheduling only writes the
    // PENDING row — the external call is detached — and any failure is swallowed
    // here so a misbehaving AI service can never fail a community submission.
    await this.aiVerificationService
      .scheduleForReport(savedReport)
      .catch(() => null);

    return savedReport;
  }

  async findAll(
    query: any,
    { includeHidden = false }: ReportVisibility = {},
  ): Promise<any> {
    const { status, tagId, search } = query;
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    // Joined users are narrowed to their public fields in SQL, so private
    // columns are never loaded, let alone serialized.
    const userColumns = (alias: string) =>
      PUBLIC_USER_FIELDS.map((field) => `${alias}.${field}`);

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoin('report.reporter', 'reporter')
      .addSelect(userColumns('reporter'))
      .leftJoinAndSelect('report.tags', 'tags')
      .leftJoinAndSelect('report.verifications', 'verifications')
      .leftJoin('verifications.user', 'verificationUser')
      .addSelect(userColumns('verificationUser'));

    if (!includeHidden) {
      queryBuilder.andWhere('report.status NOT IN (:...hiddenStatuses)', {
        hiddenStatuses: PUBLICLY_HIDDEN_REPORT_STATUSES,
      });
    }

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (tagId) {
      queryBuilder.andWhere('tags.id = :tagId', { tagId });
    }

    if (search) {
      // Bracketed so the ORs cannot escape the status/visibility filters.
      queryBuilder.andWhere(
        new Brackets((qb) =>
          qb
            .where('report.title ILIKE :search')
            .orWhere('report.description ILIKE :search')
            .orWhere('report.sourceUrl ILIKE :search'),
        ),
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('report.createdAt', 'DESC')
      .getManyAndCount();

    const processedData = data.map((report) => ({
      ...report,
      verificationCount: report.verifications?.length || 0,
    }));

    return {
      data: processedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(
    id: string,
    { includeHidden = true }: ReportVisibility = {},
  ): Promise<Report & { aiVerification: ReportAiVerification | null }> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: [
        'reporter',
        'tags',
        'verifications',
        'verifications.user',
        'evidence',
      ],
    });
    if (!report) throw new NotFoundException('Report not found');
    if (
      !includeHidden &&
      PUBLICLY_HIDDEN_REPORT_STATUSES.includes(report.status)
    ) {
      throw new NotFoundException('Report not found');
    }

    // The relations load whole User rows; only public fields leave the service.
    report.reporter = toPublicUser(report.reporter) as User;
    report.verifications?.forEach((verification) => {
      verification.user = toPublicUser(verification.user) as User;
    });

    // Only the newest attempt travels with the report; the full history is
    // served separately so ordinary detail requests stay small.
    const aiVerification = await this.aiVerificationService
      .findLatestForReport(id)
      .catch(() => null);

    return Object.assign(report, { aiVerification });
  }

  async addEvidence(
    reportId: string,
    userId: string,
    evidenceData: AddEvidenceDto,
  ): Promise<ReportEvidence> {
    const report = await this.findById(reportId);
    const evidence = this.reportEvidenceRepository.create({
      ...evidenceData,
      reportId,
      authorId: userId,
      authorName: 'User',
    });

    const saved = await this.reportEvidenceRepository.save(evidence);
    const credibilityScore = Math.max(
      report.credibilityScore,
      evidenceData.credibilityScore ?? 0,
    );
    await this.reportRepository.update(reportId, { credibilityScore });

    await this.auditLogsService.createLog({
      userId,
      action: 'added_evidence',
      entityType: 'Report',
      entityId: reportId,
      metadata: { evidenceType: evidenceData.evidenceType },
    });

    return saved;
  }

  async addVerification(
    reportId: string,
    userId: string,
    verificationData: { comment: string; status: string; rating?: number },
  ): Promise<ReportVerification> {
    const report = await this.findById(reportId);

    const verification = this.reportVerificationRepository.create({
      ...verificationData,
      reportId,
      userId,
    });

    const saved = await this.reportVerificationRepository.save(verification);

    const verifications = await this.reportVerificationRepository.findBy({
      reportId,
    });
    const positiveCount = verifications.filter(
      (v) => v.status === 'TRUE' || v.status === 'VERIFIED',
    ).length;
    const negativeCount = verifications.filter(
      (v) => v.status === 'FALSE' || v.status === 'FAKE',
    ).length;

    if (verifications.length > 0) {
      const credibilityScore = Math.round(
        (positiveCount / (positiveCount + negativeCount || 1)) * 100,
      );
      await this.reportRepository.update(reportId, { credibilityScore });
    }

    await this.auditLogsService.createLog({
      userId,
      action: 'added_verification',
      entityType: 'Report',
      entityId: reportId,
      metadata: { status: verificationData.status },
    });

    return saved;
  }

  async update(id: string, updateDto: any, userId?: string): Promise<Report> {
    const report = await this.findById(id);
    const previousStatus = report.status;
    Object.assign(report, updateDto);
    const updated = await this.reportRepository.save(report);
    await this.auditLogsService.createLog({
      userId,
      action: 'updated',
      entityType: 'Report',
      entityId: id,
      metadata: {
        previousStatus,
        nextStatus: updated.status,
        changes: updateDto,
      },
    });
    return updated;
  }

  async remove(id: string): Promise<void> {
    const report = await this.findById(id);
    await this.reportRepository.remove(report);
  }

  private async findPotentialDuplicates(
    reportData: Partial<Report>,
  ): Promise<Report[]> {
    const normalizedTitle = reportData.title?.toLowerCase().trim() || '';
    const normalizedDescription =
      reportData.description?.toLowerCase().trim() || '';
    const normalizedUrl = reportData.sourceUrl?.toLowerCase().trim() || '';

    const candidates = await this.reportRepository.find({
      where: {
        status: ReportStatus.NEW,
      },
    });

    return candidates.filter((candidate) => {
      const titleMatch =
        candidate.title?.toLowerCase().includes(normalizedTitle) ||
        normalizedTitle.includes(candidate.title?.toLowerCase() || '');
      const descriptionMatch =
        candidate.description?.toLowerCase().includes(normalizedDescription) ||
        normalizedDescription.includes(
          candidate.description?.toLowerCase() || '',
        );
      const urlMatch =
        normalizedUrl && candidate.sourceUrl?.toLowerCase() === normalizedUrl;
      return titleMatch || descriptionMatch || urlMatch;
    });
  }
}
