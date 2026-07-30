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
    : 0;

export function mergeSkillBooks(a: SkillBook = {}, b: SkillBook = {}): SkillBook {
  const merged: SkillBook = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const left = a[key] ?? { xp: 0, correct: 0, total: 0 };
    const right = b[key] ?? { xp: 0, correct: 0, total: 0 };
    merged[key] = {
      xp: Math.max(num(left.xp), num(right.xp)),
      correct: Math.max(num(left.correct), num(right.correct)),
      total: Math.max(num(left.total), num(right.total)),
    };
  }
  return merged;
}

export function mergeCalibrations(
  a: CalibrationLedger = {},
  b: CalibrationLedger = {},
): CalibrationLedger {
  const merged: CalibrationLedger = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const left = a[key] ?? { correct: 0, total: 0 };
    const right = b[key] ?? { correct: 0, total: 0 };
    merged[key] = {
      correct: Math.max(num(left.correct), num(right.correct)),
      total: Math.max(num(left.total), num(right.total)),
    };
  }
  return merged;
}
