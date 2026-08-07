import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';

export interface ContentPreview {
  targetType: ModerationTargetType;
  targetId: string | null;
  /** Short heading for the preview card. */
  title: string;
  /** The reported text itself, truncated for the queue. */
  body: string | null;
  /** Image or video URL, when the target is media. */
  mediaUrl: string | null;
  /** Outbound link, when the target is a URL. */
  externalUrl: string | null;
  /** Author of the content, when known. */
  authorId: string | null;
  /** False when the row no longer exists — deleted since the report. */
  available: boolean;
  /** Client route to the object in its natural surface, when one exists. */
  deepLink: string | null;
}

/**
 * How to fetch a preview for each target type: the table to read, the columns
 * that carry the title/body/media, and the client route to link to.
 *
 * Driven by configuration rather than a switch of hand-written queries so
 * adding a moderatable content type is a one-entry change.
 */
interface PreviewSource {
  table: string;
  titleColumn?: string;
  bodyColumn?: string;
  mediaColumn?: string;
  linkColumn?: string;
  authorColumn?: string;
  deepLink?: (id: string) => string;
  fallbackTitle: string;
}

const PREVIEW_SOURCES: Partial<Record<ModerationTargetType, PreviewSource>> = {
  [ModerationTargetType.SCENARIO]: {
    table: 'scenarios',
    titleColumn: 'title',
    bodyColumn: 'description',
    deepLink: (id) => `/dashboard/engine/${id}`,
    fallbackTitle: 'Scenario',
  },
  [ModerationTargetType.SCENE]: {
    table: 'scenes',
    titleColumn: 'title',
    bodyColumn: 'description',
    fallbackTitle: 'Scene',
  },
  [ModerationTargetType.CROWDSOURCE_REPORT]: {
    table: 'reports',
    titleColumn: 'title',
    bodyColumn: 'description',
    linkColumn: 'source_url',
    authorColumn: 'reporter_id',
    deepLink: (id) => `/dashboard/reports/${id}`,
    fallbackTitle: 'Crowdsourced report',
  },
  [ModerationTargetType.CAPTURED_CONTENT]: {
    table: 'contents',
    bodyColumn: 'raw_content',
    mediaColumn: 'media_url',
    linkColumn: 'external_url',
    authorColumn: 'created_by_user_id',
    fallbackTitle: 'Captured content',
  },
  [ModerationTargetType.USER_PROFILE]: {
    table: 'users',
    titleColumn: 'full_name',
    bodyColumn: 'username',
    authorColumn: 'id',
    deepLink: (id) => `/dashboard/moderation/users/${id}`,
    fallbackTitle: 'User profile',
  },
  [ModerationTargetType.UPLOADED_IMAGE]: {
    table: 'contents',
    bodyColumn: 'raw_content',
    mediaColumn: 'media_url',
    authorColumn: 'created_by_user_id',
    fallbackTitle: 'Uploaded image',
  },
  [ModerationTargetType.UPLOADED_VIDEO]: {
    table: 'contents',
    bodyColumn: 'raw_content',
    mediaColumn: 'media_url',
    authorColumn: 'created_by_user_id',
    fallbackTitle: 'Uploaded video',
  },
  [ModerationTargetType.EXTERNAL_LINK]: {
    table: 'contents',
    bodyColumn: 'raw_content',
    linkColumn: 'external_url',
    authorColumn: 'created_by_user_id',
    fallbackTitle: 'External link',
  },
};

const MAX_BODY_LENGTH = 2000;

/**
 * Renders the reported object for the review screen.
 *
 * Preview failures never propagate: a case whose target has been deleted must
 * still open, showing the snapshot captured when it was reported.
 */
@Injectable()
export class ContentPreviewService {
  private readonly logger = new Logger(ContentPreviewService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolve(
    targetType: ModerationTargetType,
    targetId: string | null | undefined,
    snapshot?: string | null,
  ): Promise<ContentPreview> {
    const empty: ContentPreview = {
      targetType,
      targetId: targetId ?? null,
      title: PREVIEW_SOURCES[targetType]?.fallbackTitle ?? 'Reported content',
      body: snapshot ?? null,
      mediaUrl: null,
      externalUrl: null,
      authorId: null,
      available: false,
      deepLink: null,
    };

    const source = PREVIEW_SOURCES[targetType];
    if (!source || !targetId) return empty;

    try {
      const columns = [
        source.titleColumn,
        source.bodyColumn,
        source.mediaColumn,
        source.linkColumn,
        source.authorColumn,
      ].filter(Boolean) as string[];

      if (columns.length === 0) return empty;

      // Column and table names come from the static map above, never from a
      // request; only the id is user-supplied and it is parameterised.
      const quoted = columns.map((c) => `"${c}"`).join(', ');
      const [row] = await this.dataSource.query(
        `SELECT ${quoted} FROM "${source.table}" WHERE "id" = $1 LIMIT 1`,
        [targetId],
      );

      if (!row) return empty;

      const body = source.bodyColumn ? row[source.bodyColumn] : null;

      return {
        targetType,
        targetId,
        title:
          (source.titleColumn ? row[source.titleColumn] : null) ??
          source.fallbackTitle,
        body: truncate(body ?? snapshot ?? null),
        mediaUrl: source.mediaColumn ? (row[source.mediaColumn] ?? null) : null,
        externalUrl: source.linkColumn
          ? (row[source.linkColumn] ?? null)
          : null,
        authorId: source.authorColumn
          ? (row[source.authorColumn] ?? null)
          : null,
        available: true,
        deepLink: source.deepLink?.(targetId) ?? null,
      };
    } catch (error) {
      this.logger.warn(
        `Preview lookup failed for ${targetType}:${targetId} — ${
          (error as Error).message
        }`,
      );
      return empty;
    }
  }
}

function truncate(value: string | null): string | null {
  if (!value) return null;
  return value.length > MAX_BODY_LENGTH
    ? `${value.slice(0, MAX_BODY_LENGTH)}…`
    : value;
}
