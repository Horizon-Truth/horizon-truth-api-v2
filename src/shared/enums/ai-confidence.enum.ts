/**
 * Qualitative confidence levels reported by the AI verification service.
 *
 * The service returns a label, never a probability, so nothing downstream may
 * render a numeric certainty ("95% sure") derived from these.
 */
export enum AiConfidence {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}
