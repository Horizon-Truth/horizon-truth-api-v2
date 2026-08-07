/** Workflow of a user's appeal against a moderation decision. */
export enum AppealStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

/** What the appellant is contesting. */
export enum AppealSubjectType {
  CASE = 'CASE',
  SANCTION = 'SANCTION',
  CONTENT_REMOVAL = 'CONTENT_REMOVAL',
}

/**
 * How long after a decision a user may still appeal it.
 *
 * Shared rather than duplicated: the appeals service enforces it, and the
 * self-service record uses it to decide whether to offer an "Appeal" button.
 * If those two numbers ever drifted, the UI would invite users to submit
 * appeals the API then rejects.
 */
export const APPEAL_WINDOW_DAYS = 30;
