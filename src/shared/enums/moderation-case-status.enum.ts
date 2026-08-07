/**
 * Lifecycle of a moderation case (an abuse/safety report raised against
 * platform content or a user).
 *
 * This is deliberately distinct from `ReportStatus`, which tracks the
 * *fact-checking* lifecycle of a crowdsourced misinformation claim.
 */
export enum ModerationCaseStatus {
  /** Just created, nobody owns it yet. */
  OPEN = 'OPEN',
  /** Owned by a moderator but not yet opened for review. */
  ASSIGNED = 'ASSIGNED',
  /** A moderator is actively working the case. */
  UNDER_REVIEW = 'UNDER_REVIEW',
  /** Blocked on the reporter or the reported user supplying more detail. */
  AWAITING_INFO = 'AWAITING_INFO',
  /** Raised to a senior moderator or administrator. */
  ESCALATED = 'ESCALATED',
  /** Folded into another case; see `duplicateOfId`. */
  DUPLICATE = 'DUPLICATE',
  /** Upheld — the report was valid and action was taken. */
  RESOLVED = 'RESOLVED',
  /** Rejected — no violation found. */
  DISMISSED = 'DISMISSED',
  /** Terminal state; no further action expected. */
  CLOSED = 'CLOSED',
}

/** Statuses that still require moderator attention. */
export const OPEN_CASE_STATUSES: ModerationCaseStatus[] = [
  ModerationCaseStatus.OPEN,
  ModerationCaseStatus.ASSIGNED,
  ModerationCaseStatus.UNDER_REVIEW,
  ModerationCaseStatus.AWAITING_INFO,
  ModerationCaseStatus.ESCALATED,
];

/** Statuses that count as finished work. */
export const TERMINAL_CASE_STATUSES: ModerationCaseStatus[] = [
  ModerationCaseStatus.RESOLVED,
  ModerationCaseStatus.DISMISSED,
  ModerationCaseStatus.CLOSED,
  ModerationCaseStatus.DUPLICATE,
];
