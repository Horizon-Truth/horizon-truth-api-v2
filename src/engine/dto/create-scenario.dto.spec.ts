import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateScenarioDto } from './create-scenario.dto';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { ContentLanguage } from '../../shared/enums/content-language.enum';

const base = {
  title: 'The Viral Hoax',
  description: 'A scenario about identifying fake news.',
  type: ScenarioType.SOCIAL_POST,
  difficulty: ScenarioDifficulty.EASY,
};

async function errorsFor(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateScenarioDto, payload);
  return validate(dto);
}

describe('CreateScenarioDto language validation', () => {
  it('rejects a scenario with no language', async () => {
    const errors = await errorsFor({ ...base });
    expect(errors.some((e) => e.property === 'language')).toBe(true);
  });

  it('rejects an unsupported language', async () => {
    const errors = await errorsFor({ ...base, language: 'fr' });
    expect(errors.some((e) => e.property === 'language')).toBe(true);
  });

  it.each([
    ContentLanguage.ENGLISH,
    ContentLanguage.AMHARIC,
    ContentLanguage.AFAAN_OROMO,
  ])('accepts supported language %s', async (language) => {
    const errors = await errorsFor({ ...base, language });
    expect(errors.some((e) => e.property === 'language')).toBe(false);
  });
});
