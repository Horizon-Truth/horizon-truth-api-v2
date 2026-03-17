import { mergeSkillBooks, mergeCalibrations } from './learning-profile.util';

describe('mergeSkillBooks', () => {
  it('takes the element-wise max so no device loses progress', () => {
    const merged = mergeSkillBooks(