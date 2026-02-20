import { AppDataSource } from './data-source';
import {
  SUPPORTED_LANGUAGE_CODES,
  DEFAULT_CONTENT_LANGUAGE,
} from '../shared/enums/content-language.enum';

/**
 * Diagnostics utility to verify the multilingual content system is healthy.
 *
 * For every content table it reports the row count per supported language and
 * flags any rows whose language is NULL or outside the supported set (which
 * would indicate content that could bypass language filtering).
 *