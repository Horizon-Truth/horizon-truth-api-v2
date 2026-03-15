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