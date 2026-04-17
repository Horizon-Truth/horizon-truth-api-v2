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