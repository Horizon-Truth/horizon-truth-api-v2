import { SUPPORTED_LANGUAGES } from '../../shared/enums/content-language.enum';
import { ReportsSeederService } from './reports-seeder.service';

/**
 * The languages seeder used to keep its own hardcoded list, which drifted from
 * `SUPPORTED_LANGUAGES`: it wrote `or` for Afaan Oromo where the platform uses
 * `om`, and spelled the name "Afan Oromo".
 *
 * Because the existence check only looked at `code`, a row already stored under
 * `om` was invisible to it — so every re-seed attempted an insert and died on
 * the `name` unique constraint, aborting the whole seed run before the
 * moderation seeder was reached.
 */
describe('ReportsSeederService — languages', () => {
  let languageRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let service: ReportsSeederService;

  /** Reach the private method the way the seeder's own `seed()` does. */
  const seedLanguages = () =>
    (
      service as unknown as { seedLanguages: () => Promise<void> }
    ).seedLanguages();

  beforeEach(() => {
    languageRepository = {
      findOne: jest.fn(),
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (entity: unknown) => entity),
    };

    service = new ReportsSeederService(
      {} as never, // reportTagRepository
      {} as never, // reportRepository
      {} as never, // verificationRepository
      languageRepository as never,
      {} as never, // userRepository
    );
  });

  it('seeds from SUPPORTED_LANGUAGES rather than a private list', async () => {
    languageRepository.findOne.mockResolvedValue(null);

    await seedLanguages();

    expect(languageRepository.save).toHaveBeenCalledTimes(
      SUPPORTED_LANGUAGES.length,
    );

    const saved = languageRepository.save.mock.calls.map(
      ([entity]: [{ code: string; name: string }]) => entity,
    );

    for (const descriptor of SUPPORTED_LANGUAGES) {
      expect(saved).toContainEqual(
        expect.objectContaining({
          code: descriptor.code,
          name: descriptor.englishName,
        }),
      );
    }
  });

  it('never writes the legacy `or` code for Afaan Oromo', async () => {
    languageRepository.findOne.mockResolvedValue(null);

    await seedLanguages();

    const codes = languageRepository.save.mock.calls.map(
      ([entity]: [{ code: string }]) => entity.code,
    );

    expect(codes).toContain('om');
    expect(codes).not.toContain('or');
  });

  it('looks a language up by name as well as code', async () => {
    // Checking only `code` is what let a row stored under a different code
    // slip through and collide on the `name` unique constraint.
    languageRepository.findOne.mockResolvedValue(null);

    await seedLanguages();

    for (const [options] of languageRepository.findOne.mock.calls) {
      const where = (options as { where: Array<Record<string, string>> }).where;

      expect(Array.isArray(where)).toBe(true);
      expect(where.some((clause) => 'code' in clause)).toBe(true);
      expect(where.some((clause) => 'name' in clause)).toBe(true);
    }
  });

  it('reconciles a legacy row instead of inserting a duplicate', async () => {
    const legacy = {
      id: 'l-1',
      name: 'Afan Oromo',
      code: 'om',
      isActive: true,
    };

    languageRepository.findOne.mockImplementation(
      async ({ where }: { where: Array<Record<string, string>> }) => {
        const wanted = where.map((c) => c.code ?? c.name);
        return wanted.includes('om') || wanted.includes('Afaan Oromo')
          ? legacy
          : null;
      },
    );

    await seedLanguages();

    // The legacy row is corrected in place, keeping its id and any rows that
    // reference it.
    expect(languageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'l-1', name: 'Afaan Oromo', code: 'om' }),
    );
    expect(languageRepository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Afaan Oromo' }),
    );
  });

  it('is a no-op when every language already matches', async () => {
    languageRepository.findOne.mockImplementation(
      async ({ where }: { where: Array<Record<string, string>> }) => {
        const code = where.find((c) => 'code' in c)?.code;
        const descriptor = SUPPORTED_LANGUAGES.find((l) => l.code === code);
        return descriptor
          ? {
              id: `l-${descriptor.code}`,
              name: descriptor.englishName,
              code: descriptor.code,
              isActive: true,
            }
          : null;
      },
    );

    await seedLanguages();

    // Re-running the seed must not write anything, or `npm run seed` becomes
    // unsafe to repeat.
    expect(languageRepository.save).not.toHaveBeenCalled();
  });
});
