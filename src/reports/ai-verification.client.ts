import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiVerdict } from '../shared/enums/ai-verdict.enum';
import { AiConfidence } from '../shared/enums/ai-confidence.enum';
import { AiVerificationSource } from './entities/report-ai-verification.entity';

/**
 * The only place that knows the shape of https://ai.horizontruth.org/api/detect.
 *
 * Everything upstream of this file works with the normalised camelCase result,
 * so a change to the external contract stays contained here.
 */

const DEFAULT_ENDPOINT = 'https://ai.horizontruth.org/api/detect';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Storage caps — the API is not bound to keep its fields short. */
const MAX_TEXT_LENGTH = 8_000;
const MAX_SOURCE_EXCERPT = 1_000;
const MAX_SOURCES = 20;

export type AiVerificationFailureReason =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'INVALID_REQUEST';

/**
 * Failure of the external call, carrying a reason plus a message that is safe to
 * store and show to end users (no upstream bodies, no stack traces).
 */
export class AiVerificationError extends Error {
  constructor(
    readonly reason: AiVerificationFailureReason,
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AiVerificationError';
  }
}

export interface AiDetectionResult {
  claim: string;
  verdict: AiVerdict | string;
  confidence?: string;
  reasoning?: string;
  evidenceSummary?: string;
  sources: AiVerificationSource[];
}

/** Upstream spellings we map onto the verdicts the UI styles explicitly. */
const VERDICT_SYNONYMS: Record<string, AiVerdict> = {
  TRUE: AiVerdict.TRUE,
  REAL: AiVerdict.TRUE,
  ACCURATE: AiVerdict.TRUE,
  CORRECT: AiVerdict.TRUE,
  SUPPORTED: AiVerdict.TRUE,
  FALSE: AiVerdict.FALSE,
  FAKE: AiVerdict.FALSE,
  INCORRECT: AiVerdict.FALSE,
  DEBUNKED: AiVerdict.FALSE,
  REFUTED: AiVerdict.FALSE,
  MIXED: AiVerdict.MIXED,
  MIXTURE: AiVerdict.MIXED,
  PARTIALLY_TRUE: AiVerdict.MIXED,
  PARTLY_TRUE: AiVerdict.MIXED,
  MISLEADING: AiVerdict.MIXED,
  UNVERIFIED: AiVerdict.UNVERIFIED,
  UNVERIFIABLE: AiVerdict.UNVERIFIED,
  UNKNOWN: AiVerdict.UNVERIFIED,
  UNCERTAIN: AiVerdict.UNVERIFIED,
  INSUFFICIENT_EVIDENCE: AiVerdict.UNVERIFIED,
  NO_EVIDENCE: AiVerdict.UNVERIFIED,
};

const CONFIDENCE_SYNONYMS: Record<string, AiConfidence> = {
  HIGH: AiConfidence.HIGH,
  VERY_HIGH: AiConfidence.HIGH,
  STRONG: AiConfidence.HIGH,
  MEDIUM: AiConfidence.MEDIUM,
  MODERATE: AiConfidence.MEDIUM,
  MID: AiConfidence.MEDIUM,
  LOW: AiConfidence.LOW,
  VERY_LOW: AiConfidence.LOW,
  WEAK: AiConfidence.LOW,
};

function asText(value: unknown, max = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
}

/** Uppercases and underscores an upstream label so synonyms match reliably. */
function canonicalKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function normaliseVerdict(value: unknown): AiVerdict | string {
  const raw = asText(value, 64);
  if (!raw) return AiVerdict.UNVERIFIED;

  const key = canonicalKey(raw);
  // Unknown verdicts are kept (uppercased) rather than forced into the known
  // set — the API may add verdicts, and silently mislabelling one would be worse
  // than showing it neutrally.
  return VERDICT_SYNONYMS[key] ?? key.slice(0, 64);
}

export function normaliseConfidence(value: unknown): string | undefined {
  const raw = asText(value, 32);
  if (!raw) return undefined;

  const key = canonicalKey(raw);
  if (CONFIDENCE_SYNONYMS[key]) return CONFIDENCE_SYNONYMS[key];

  // Preserve an unrecognised label in Title Case; never invent a percentage.
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Only http(s) links are ever stored, so nothing can render a javascript: URL. */
export function sanitiseSourceUrl(value: unknown): string | undefined {
  const raw = asText(value, 2_048);
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Relevance is documented as 0–1. Percentages are converted; anything else is
 * dropped rather than guessed at, so the UI never shows a fabricated score.
 */
export function normaliseScore(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  if (numeric >= 0 && numeric <= 1) return numeric;
  if (numeric > 1 && numeric <= 100) return numeric / 100;
  return undefined;
}

export function normaliseSources(value: unknown): AiVerificationSource[] {
  if (!Array.isArray(value)) return [];

  const sources: AiVerificationSource[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;

    const raw = entry as Record<string, unknown>;
    const url = sanitiseSourceUrl(raw.url);
    if (!url) continue; // A source we cannot link to is not evidence.

    sources.push({
      title: asText(raw.title, 300) ?? new URL(url).hostname,
      url,
      content: asText(raw.content, MAX_SOURCE_EXCERPT),
      score: normaliseScore(raw.score),
    });

    if (sources.length >= MAX_SOURCES) break;
  }

  return sources;
}

/**
 * Maps the raw API payload onto the application model, tolerating missing
 * fields. Throws only when the payload carries nothing usable at all.
 */
export function normaliseDetectionResponse(
  payload: unknown,
  requestedClaim: string,
): AiDetectionResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AiVerificationError(
      'MALFORMED_RESPONSE',
      'The AI service returned an unexpected response.',
    );
  }

  const raw = payload as Record<string, unknown>;
  const verdict = normaliseVerdict(raw.verdict);
  const reasoning = asText(raw.reasoning);
  const evidenceSummary = asText(raw.evidence_summary ?? raw.evidenceSummary);
  const sources = normaliseSources(raw.sources);

  const hasVerdict = asText(raw.verdict) !== undefined;
  if (!hasVerdict && !reasoning && !evidenceSummary && sources.length === 0) {
    throw new AiVerificationError(
      'MALFORMED_RESPONSE',
      'The AI service returned no usable assessment.',
    );
  }

  return {
    claim: asText(raw.claim) ?? requestedClaim,
    verdict,
    confidence: normaliseConfidence(raw.confidence),
    reasoning,
    evidenceSummary,
    sources,
  };
}

@Injectable()
export class AiVerificationClient {
  private readonly logger = new Logger(AiVerificationClient.name);
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.endpoint =
      this.configService.get<string>('AI_VERIFICATION_URL') ?? DEFAULT_ENDPOINT;
    this.timeoutMs = Number(
      this.configService.get<string>('AI_VERIFICATION_TIMEOUT_MS') ??
        DEFAULT_TIMEOUT_MS,
    );
  }

  /** Host we recorded the assessment against, for provenance on stored attempts. */
  get provider(): string {
    try {
      return new URL(this.endpoint).host;
    } catch {
      return this.endpoint;
    }
  }

  async detect(claim: string): Promise<AiDetectionResult> {
    const trimmed = claim?.trim();
    if (!trimmed) {
      throw new AiVerificationError(
        'INVALID_REQUEST',
        'No claim was available to verify.',
      );
    }

    const timeout =
      Number.isFinite(this.timeoutMs) && this.timeoutMs > 0
        ? this.timeoutMs
        : DEFAULT_TIMEOUT_MS;

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ claim: trimmed }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error) {
      const name = (error as Error)?.name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new AiVerificationError(
          'TIMEOUT',
          'The AI verification service took too long to respond.',
        );
      }
      this.logger.warn(
        `AI verification request failed: ${(error as Error)?.message}`,
      );
      throw new AiVerificationError(
        'NETWORK',
        'The AI verification service could not be reached.',
      );
    }

    if (!response.ok) {
      this.logger.warn(
        `AI verification responded with HTTP ${response.status}`,
      );
      throw new AiVerificationError(
        'HTTP_ERROR',
        'The AI verification service returned an error.',
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiVerificationError(
        'MALFORMED_RESPONSE',
        'The AI service returned an unreadable response.',
      );
    }

    return normaliseDetectionResponse(payload, trimmed);
  }
}
