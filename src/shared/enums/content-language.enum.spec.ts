import {
  ContentLanguage,
  DEFAULT_CONTENT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  isSupportedLanguage,
  normalizeLanguage,
} from './content-language.enum';

describe('ContentLanguage config', () => {
  it('supports exactly English, Amharic and Afaan Oromo', () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(['en', 'am', 'om']);
  });

  it('defaults to English', () => {
    expect(DEFAULT_CONTENT_LANGUAGE).toBe(ContentLanguage.ENGLISH);
    const defaults = SUPPORTED_LANGUAGES.filter((l) => l.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].code).toBe(ContentLanguage.ENGLISH);
  });

  it('exposes native names for the switcher', () => {
    const am = SUPPORTED_LANGUAGES.find((l) => l.code === ContentLanguage.AMHARIC);
    const om = SUPPORTED_LANGUAGES.find(
      (l) => l.code === ContentLanguage.AFAAN_OROMO,
    );
    expect(am?.nativeName).toBe('አማርኛ');
    expect(om?.nativeName).toBe('Afaan Oromoo');
  });

  describe('isSupportedLanguage', () => {
    it('accepts supported codes', () => {
      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('am')).toBe(true);
      expect(isSupportedLanguage('om')).toBe(true);
    });

    it('rejects unsupported / malformed values', () => {
      expect(isSupportedLanguage('fr')).toBe(false);
      expect(isSupportedLanguage('')).toBe(false);
      expect(isSupportedLanguage(null)).toBe(false);
      expect(isSupportedLanguage(undefined)).toBe(false);
      expect(isSupportedLanguage(42)).toBe(false);
    });
  });

  describe('normalizeLanguage', () => {
    it('passes through supported codes unchanged', () => {
      expect(normalizeLanguage('am')).toBe(ContentLanguage.AMHARIC);
    });

    it('falls back to the default for unknown/legacy values', () => {
      expect(normalizeLanguage(null)).toBe(DEFAULT_CONTENT_LANGUAGE);
      expect(normalizeLanguage('klingon')).toBe(DEFAULT_CONTENT_LANGUAGE);
      expect(normalizeLanguage(undefined)).toBe(DEFAULT_CONTENT_LANGUAGE);
    });
  });
});
