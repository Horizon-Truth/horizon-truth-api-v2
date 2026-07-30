import { mergeSkillBooks, mergeCalibrations } from './learning-profile.util';

describe('mergeSkillBooks', () => {
  it('takes the element-wise max so no device loses progress', () => {
    const merged = mergeSkillBooks(
      { 'data-literacy': { xp: 30, correct: 2, total: 4 } },
      { 'data-literacy': { xp: 12, correct: 3, total: 3 } },
    );
    expect(merged['data-literacy']).toEqual({ xp: 30, correct: 3, total: 4 });
  });

  it('unions skills present on only one side', () => {
    const merged = mergeSkillBooks(
      { 'media-analysis': { xp: 12, correct: 1, total: 1 } },
      { 'network-awareness': { xp: 3, correct: 0, total: 1 } },
    );
    expect(Object.keys(merged).sort()).toEqual([
      'media-analysis',
      'network-awareness',
    ]);
  });

  it('sanitizes negative, missing, and non-numeric counters', () => {
    const merged = mergeSkillBooks(
      { bad: { xp: -5, correct: NaN, total: 2.9 } as any },
      { bad: { xp: 'x', correct: 1 } as any },
    );
    expect(merged['bad']).toEqual({ xp: 0, correct: 1, total: 2 });
  });

  it('handles undefined ledgers', () => {
    expect(mergeSkillBooks(undefined, undefined)).toEqual({});
  });
});

describe('mergeCalibrations', () => {
  it('merges buckets element-wise and preserves correct <= total', () => {
    const merged = mergeCalibrations(
      { certain: { correct: 5, total: 6 } },
      { certain: { correct: 2, total: 9 } },
    );
    expect(merged['certain']).toEqual({ correct: 5, total: 9 });
    expect(merged['certain'].correct).toBeLessThanOrEqual(
      merged['certain'].total,
    );
  });
});
