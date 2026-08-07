import {
  ModerationCaseStatus,
  OPEN_CASE_STATUSES,
  TERMINAL_CASE_STATUSES,
} from '../shared/enums/moderation-case-status.enum';
import { ALLOWED_TRANSITIONS, canTransition } from './moderation-case-state';

describe('Moderation case state machine', () => {
  it('defines transitions for every status, so no case can become stuck', () => {
    for (const status of Object.values(ModerationCaseStatus)) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
      expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
    }
  });

  it('lets a fresh case be claimed, escalated or decided immediately', () => {
    expect(
      canTransition(ModerationCaseStatus.OPEN, ModerationCaseStatus.ASSIGNED),
    ).toBe(true);
    expect(
      canTransition(ModerationCaseStatus.OPEN, ModerationCaseStatus.ESCALATED),
    ).toBe(true);
    expect(
      canTransition(ModerationCaseStatus.OPEN, ModerationCaseStatus.DISMISSED),
    ).toBe(true);
  });

  it('refuses to close a case that was never opened', () => {
    expect(
      canTransition(ModerationCaseStatus.OPEN, ModerationCaseStatus.CLOSED),
    ).toBe(false);
  });

  it('refuses to move a decided case straight to another decision', () => {
    expect(
      canTransition(
        ModerationCaseStatus.RESOLVED,
        ModerationCaseStatus.DISMISSED,
      ),
    ).toBe(false);
    expect(
      canTransition(
        ModerationCaseStatus.DISMISSED,
        ModerationCaseStatus.RESOLVED,
      ),
    ).toBe(false);
  });

  it('allows every terminal status to be reopened', () => {
    for (const status of TERMINAL_CASE_STATUSES) {
      expect(canTransition(status, ModerationCaseStatus.OPEN)).toBe(true);
    }
  });

  it('does not allow a merged duplicate to be resolved without reopening', () => {
    expect(
      canTransition(
        ModerationCaseStatus.DUPLICATE,
        ModerationCaseStatus.RESOLVED,
      ),
    ).toBe(false);
    expect(
      canTransition(ModerationCaseStatus.DUPLICATE, ModerationCaseStatus.OPEN),
    ).toBe(true);
  });

  it('lets an awaiting-info case be closed when the reporter never replies', () => {
    expect(
      canTransition(
        ModerationCaseStatus.AWAITING_INFO,
        ModerationCaseStatus.CLOSED,
      ),
    ).toBe(true);
  });

  it('routes an escalation back to review or to a decision, not to OPEN', () => {
    expect(
      canTransition(
        ModerationCaseStatus.ESCALATED,
        ModerationCaseStatus.UNDER_REVIEW,
      ),
    ).toBe(true);
    expect(
      canTransition(ModerationCaseStatus.ESCALATED, ModerationCaseStatus.OPEN),
    ).toBe(false);
  });

  it('classifies every status as either open work or terminal', () => {
    const classified = new Set([
      ...OPEN_CASE_STATUSES,
      ...TERMINAL_CASE_STATUSES,
    ]);

    for (const status of Object.values(ModerationCaseStatus)) {
      expect(classified.has(status)).toBe(true);
    }
  });

  it('never classifies a status as both open and terminal', () => {
    for (const status of OPEN_CASE_STATUSES) {
      expect(TERMINAL_CASE_STATUSES).not.toContain(status);
    }
  });
});
