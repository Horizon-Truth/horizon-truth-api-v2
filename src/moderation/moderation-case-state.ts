import { ModerationCaseStatus } from '../shared/enums/moderation-case-status.enum';

/**
 * Permitted case transitions.
 *
 * Keeping the state machine as data — rather than as conditionals spread
 * through the service — means an illegal move is rejected the same way no
 * matter which endpoint attempts it, and the diagram in the moderator
 * handbook can be generated from this table.
 */
export const ALLOWED_TRANSITIONS: Record<
  ModerationCaseStatus,
  ModerationCaseStatus[]
> = {
  [ModerationCaseStatus.OPEN]: [
    ModerationCaseStatus.ASSIGNED,
    ModerationCaseStatus.UNDER_REVIEW,
    ModerationCaseStatus.ESCALATED,
    ModerationCaseStatus.DUPLICATE,
    ModerationCaseStatus.RESOLVED,
    ModerationCaseStatus.DISMISSED,
  ],
  [ModerationCaseStatus.ASSIGNED]: [
    ModerationCaseStatus.OPEN,
    ModerationCaseStatus.ASSIGNED,
    ModerationCaseStatus.UNDER_REVIEW,
    ModerationCaseStatus.AWAITING_INFO,
    ModerationCaseStatus.ESCALATED,
    ModerationCaseStatus.DUPLICATE,
    ModerationCaseStatus.RESOLVED,
    ModerationCaseStatus.DISMISSED,
  ],
  [ModerationCaseStatus.UNDER_REVIEW]: [
    ModerationCaseStatus.ASSIGNED,
    ModerationCaseStatus.UNDER_REVIEW,
    ModerationCaseStatus.AWAITING_INFO,
    ModerationCaseStatus.ESCALATED,
    ModerationCaseStatus.DUPLICATE,
    ModerationCaseStatus.RESOLVED,
    ModerationCaseStatus.DISMISSED,
  ],
  [ModerationCaseStatus.AWAITING_INFO]: [
    ModerationCaseStatus.UNDER_REVIEW,
    ModerationCaseStatus.ESCALATED,
    ModerationCaseStatus.RESOLVED,
    ModerationCaseStatus.DISMISSED,
    ModerationCaseStatus.CLOSED,
  ],
  [ModerationCaseStatus.ESCALATED]: [
    ModerationCaseStatus.UNDER_REVIEW,
    ModerationCaseStatus.ASSIGNED,
    ModerationCaseStatus.RESOLVED,
    ModerationCaseStatus.DISMISSED,
  ],
  [ModerationCaseStatus.DUPLICATE]: [
    // Un-merging is a reopen, which re-enters the queue as OPEN.
    ModerationCaseStatus.OPEN,
  ],
  [ModerationCaseStatus.RESOLVED]: [
    ModerationCaseStatus.CLOSED,
    ModerationCaseStatus.OPEN,
  ],
  [ModerationCaseStatus.DISMISSED]: [
    ModerationCaseStatus.CLOSED,
    ModerationCaseStatus.OPEN,
  ],
  [ModerationCaseStatus.CLOSED]: [ModerationCaseStatus.OPEN],
};

export function canTransition(
  from: ModerationCaseStatus,
  to: ModerationCaseStatus,
): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
