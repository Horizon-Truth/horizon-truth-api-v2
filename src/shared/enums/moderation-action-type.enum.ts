/**
 * Every discrete action a moderator can take. One row is appended to
 * `moderation_actions` per action, which is what the case timeline renders.
 *
 * The first four values predate the moderation module and are retained so
 * existing rows keep their meaning.
 */
export enum ModerationActionType {
  ESCALATE = 'ESCALATE',
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
  REQUEST_MORE_INFO = 'REQUEST_MORE_INFO',

  // --- Case lifecycle ---
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  CLAIMED = 'CLAIMED',
  REASSIGNED = 'REASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  REVIEW_STARTED = 'REVIEW_STARTED',
  APPROVED = 'APPROVED',
  DISMISSED = 'DISMISSED',
  MERGED_DUPLICATE = 'MERGED_DUPLICATE',
  REOPENED = 'REOPENED',
  CLOSED = 'CLOSED',
  NOTE_ADDED = 'NOTE_ADDED',

  // --- Content actions ---
  CONTENT_FLAGGED = 'CONTENT_FLAGGED',
  CONTENT_UNFLAGGED = 'CONTENT_UNFLAGGED',
  CONTENT_HIDDEN = 'CONTENT_HIDDEN',
  CONTENT_DELETED = 'CONTENT_DELETED',
  CONTENT_RESTORED = 'CONTENT_RESTORED',

  // --- User actions ---
  USER_WARNED = 'USER_WARNED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  USER_RESTORED = 'USER_RESTORED',

  // --- Appeals ---
  APPEAL_SUBMITTED = 'APPEAL_SUBMITTED',
  APPEAL_REVIEW_STARTED = 'APPEAL_REVIEW_STARTED',
  APPEAL_ACCEPTED = 'APPEAL_ACCEPTED',
  APPEAL_REJECTED = 'APPEAL_REJECTED',
}

/**
 * Actions that must never be recorded without a written reason. The service
 * layer enforces this, so a UI bug cannot produce an unexplained sanction.
 */
export const REASON_REQUIRED_ACTIONS: ModerationActionType[] = [
  ModerationActionType.CONTENT_HIDDEN,
  ModerationActionType.CONTENT_DELETED,
  ModerationActionType.CONTENT_RESTORED,
  ModerationActionType.USER_WARNED,
  ModerationActionType.USER_SUSPENDED,
  ModerationActionType.USER_BANNED,
  ModerationActionType.USER_RESTORED,
  ModerationActionType.ESCALATE,
  ModerationActionType.APPEAL_ACCEPTED,
  ModerationActionType.APPEAL_REJECTED,
];
