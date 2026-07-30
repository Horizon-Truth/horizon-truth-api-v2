export enum SceneContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CHAT = 'CHAT',
  FEED = 'FEED',
  /** Network spread visualization (already supported by the client). */
  PROPAGATION = 'PROPAGATION',
  /** Phase 10 — inspect a suspicious link: domain anatomy + page clues. */
  URL_INSPECTION = 'URL_INSPECTION',
  /** Phase 10 — compare how multiple sources report the same event. */
  SOURCE_COMPARISON = 'SOURCE_COMPARISON',
}
