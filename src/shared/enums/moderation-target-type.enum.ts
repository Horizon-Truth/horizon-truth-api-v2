/**
 * The kind of object a moderation case points at.
 *
 * Cases are polymorphic: `targetType` + `targetId` locate the object, and the
 * moderation service knows how to render a preview for each type.
 */
export enum ModerationTargetType {
  SCENARIO = 'SCENARIO',
  SCENE = 'SCENE',
  COMMENT = 'COMMENT',
  DISCUSSION = 'DISCUSSION',
  USER_PROFILE = 'USER_PROFILE',
  UPLOADED_IMAGE = 'UPLOADED_IMAGE',
  UPLOADED_VIDEO = 'UPLOADED_VIDEO',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  /** A crowdsourced fact-check submission (the `reports` table). */
  CROWDSOURCE_REPORT = 'CROWDSOURCE_REPORT',
  /** Free-form content captured by the reporting flow (`contents` table). */
  CAPTURED_CONTENT = 'CAPTURED_CONTENT',
}
