/**
 * Canonical flag codes. The `moderation_flags` table stores the presentation
 * metadata (colour, icon, severity, description) for each of these so
 * administrators can retune labels without a code change, but the codes
 * themselves are fixed so analytics stay comparable over time.
 */
export enum ModerationFlagType {
  SPAM = 'SPAM',
  MISINFORMATION = 'MISINFORMATION',
  HARASSMENT = 'HARASSMENT',
  HATE_SPEECH = 'HATE_SPEECH',
  VIOLENCE = 'VIOLENCE',
  GRAPHIC_CONTENT = 'GRAPHIC_CONTENT',
  FALSE_INFORMATION = 'FALSE_INFORMATION',
  IMPERSONATION = 'IMPERSONATION',
  COPYRIGHT = 'COPYRIGHT',
  UNSAFE_EXTERNAL_LINK = 'UNSAFE_EXTERNAL_LINK',
  LOW_QUALITY = 'LOW_QUALITY',
  DUPLICATE = 'DUPLICATE',
  NEEDS_FACT_CHECK = 'NEEDS_FACT_CHECK',
  UNDER_REVIEW = 'UNDER_REVIEW',
  EDUCATIONAL_CONCERN = 'EDUCATIONAL_CONCERN',
  /** Organisation-defined flag; the row's `label` carries the meaning. */
  CUSTOM = 'CUSTOM',
}

/** How much weight a flag carries when computing severity and risk scores. */
export enum ModerationFlagSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/** Numeric weight per severity, used by risk scoring and queue ordering. */
export const FLAG_SEVERITY_WEIGHT: Record<ModerationFlagSeverity, number> = {
  [ModerationFlagSeverity.INFO]: 0,
  [ModerationFlagSeverity.LOW]: 1,
  [ModerationFlagSeverity.MEDIUM]: 3,
  [ModerationFlagSeverity.HIGH]: 7,
  [ModerationFlagSeverity.CRITICAL]: 12,
};
