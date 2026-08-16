/**
 * Verdicts the AI verification service is known to return.
 *
 * The external API may add verdicts over time, so stored/served verdicts are
 * typed as `AiVerdict | string`: unknown values are passed through normalised
 * rather than dropped, and consumers must not assume a closed set.
 */
export enum AiVerdict {
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  MIXED = 'MIXED',
  UNVERIFIED = 'UNVERIFIED',
}
