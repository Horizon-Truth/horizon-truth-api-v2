/**
 * Merge logic for player learning ledgers.
 *
 * Skill and calibration counters only ever grow, so two divergent copies
 * (e.g. from two devices) are reconciled by taking the element-wise maximum
 * of every counter. This can never lose progress and never double-counts a
 * cumulative ledger, and since correct <= total holds in each source it also
 * holds in the merge.
 */

export interface SkillCounters {
  xp: number;
  correct: number;
  total: number;
}

export interface CalibrationCounters {
  correct: number;
  total: number;
}

export type SkillBook = Record<string, SkillCounters>;
export type CalibrationLedger = Record<string, CalibrationCounters>;

const num = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)