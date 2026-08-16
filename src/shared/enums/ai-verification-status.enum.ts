/**
 * Lifecycle of a single AI verification attempt against a crowdsourced report.
 *
 * A FAILED attempt never invalidates the report itself — AI verification is one
 * evidence layer next to community and moderator review, not a gate on it.
 */
export enum AiVerificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
