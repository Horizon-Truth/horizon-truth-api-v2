/**
 * Centralized content-language definitions for the multilingual content system.
 *
 * This is the single source of truth for every language the platform supports.
 * Adding a new language is intentionally a one-place change: append a member to
 * the `ContentLanguage` enum and a descriptor to `SUPPORTED_LANGUAGES`. Nothing
 * else in the codebase should hardcode language string literals.
 */