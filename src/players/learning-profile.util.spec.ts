import { mergeSkillBooks, mergeCalibrations } from './learning-profile.util';

describe('mergeSkillBooks', () => {
  it('takes the element-wise max so no device loses progress', () => {
    const merged = mergeSkillBooks(
      { 'data-literacy': { xp: 30, correct: 2, total: 4 } },
      { 'data-literacy': { xp: 12, correct: 3, total: 3 } },
    );
    expect(merged['data-literacy']).toEqual({ xp: 30, correct: 3, total: 4 });
  });