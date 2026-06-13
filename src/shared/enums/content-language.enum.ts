/**
 * Centralized content-language definitions for the multilingual content system.
 *
 * This is the single source of truth for every language the platform supports.
 * Adding a new language is intentionally a one-place change: append a member to
 * the `ContentLanguage` enum and a descriptor to `SUPPORTED_LANGUAGES`. Nothing
 * else in the codebase should hardcode language string literals.
 */
export enum ContentLanguage {
  ENGLISH = 'en',
  AMHARIC = 'am',
  AFAAN_OROMO = 'om',
}

/**
 * The default language applied to all existing and future content when none is
 * explicitly provided. All legacy/pre-migration content is treated as English.
 */
export const DEFAULT_CONTENT_LANGUAGE = ContentLanguage.ENGLISH;

export interface LanguageDescriptor {
  /** ISO-style code persisted in the database and used in query params. */
  code: ContentLanguage;
  /** English display name (for admin tooling / fallbacks). */
  englishName: string;
  /** Native display name (for the public language switcher). */
  nativeName: string;
  /** Whether this is the platform default. Exactly one should be `true`. */
  isDefault: boolean;
}

/**
 * Ordered list of supported languages with display metadata. Drives switchers,
 * dropdowns, validation and Swagger docs so the UI never hardcodes the list.
 */
export const SUPPORTED_LANGUAGES: readonly LanguageDescriptor[] = [
  {
    code: ContentLanguage.ENGLISH,
    englishName: 'English',
    nativeName: 'English',
    isDefault: true,
  },
  {
    code: ContentLanguage.AMHARIC,
    englishName: 'Amharic',
    nativeName: 'አማርኛ',
    isDefault: false,
  },
  {
    code: ContentLanguage.AFAAN_OROMO,
    englishName: 'Afaan Oromo',
    nativeName: 'Afaan Oromoo',
    isDefault: false,
  },
] as const;

/** All valid language codes, e.g. for `IsIn` validation and array filters. */
export const SUPPORTED_LANGUAGE_CODES: readonly ContentLanguage[] =
  SUPPORTED_LANGUAGES.map((l) => l.code);

/** Type guard: is the given value a supported language code? */
export function isSupportedLanguage(value: unknown): value is ContentLanguage {
  return (
    typeof value === 'string' &&
    SUPPORTED_LANGUAGE_CODES.includes(value as ContentLanguage)
  );
}

/**
 * Normalizes an arbitrary input into a valid `ContentLanguage`.
 * Falls back to the default language for null/unknown values so that legacy
 * data and malformed input never bypass the language system.
 */
export function normalizeLanguage(value: unknown): ContentLanguage {
  if (isSupportedLanguage(value)) {
    return value;
  }
  return DEFAULT_CONTENT_LANGUAGE;
}
