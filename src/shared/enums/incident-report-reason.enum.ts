/**
 * Why a reporter raised a case. This is the *reporter's* claim; the
 * moderator's conclusion is expressed with `ModerationFlagType` instead.
 *
 * The first five values predate the moderation module and are retained so
 * existing `incident_reports` rows keep their meaning.
 */
export enum IncidentReportReason {
  SCAM = 'SCAM',
  HATE_SPEECH = 'HATE_SPEECH',
  VIOLENCE = 'VIOLENCE',
  FALSE_INFO = 'FALSE_INFO',
  OTHER = 'OTHER',

  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  GRAPHIC_CONTENT = 'GRAPHIC_CONTENT',
  IMPERSONATION = 'IMPERSONATION',
  COPYRIGHT = 'COPYRIGHT',
  UNSAFE_LINK = 'UNSAFE_LINK',
  LOW_QUALITY = 'LOW_QUALITY',
  DUPLICATE = 'DUPLICATE',
  EDUCATIONAL_CONCERN = 'EDUCATIONAL_CONCERN',
}
