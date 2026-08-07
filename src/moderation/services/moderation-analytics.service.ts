import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { ModerationAction } from '../../incidents/entities/moderation-action.entity';
import { ModerationAppeal } from '../entities/moderation-appeal.entity';
import { UserSanction } from '../entities/user-sanction.entity';

import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { AppealStatus } from '../../shared/enums/moderation-appeal.enum';
import {
  AnalyticsGranularity,
  ModerationAnalyticsQueryDto,
} from '../dto/analytics.dto';

export interface TimeSeriesPoint {
  bucket: string;
  [series: string]: string | number;
}

/**
 * Read-only aggregates for the dashboard charts and the analytics page.
 *
 * All queries are windowed and grouped in SQL rather than in JavaScript — the
 * moderation tables grow without bound, and pulling rows into the process to
 * count them would degrade as soon as the platform got busy.
 */
@Injectable()
export class ModerationAnalyticsService {
  constructor(
    @InjectRepository(IncidentReport)
    private readonly caseRepo: Repository<IncidentReport>,
    @InjectRepository(ModerationAction)
    private readonly actionRepo: Repository<ModerationAction>,
    @InjectRepository(ModerationAppeal)
    private readonly appealRepo: Repository<ModerationAppeal>,
    @InjectRepository(UserSanction)
    private readonly sanctionRepo: Repository<UserSanction>,
    private readonly dataSource: DataSource,
  ) {}

  /** Everything the analytics page renders, in one round trip. */
  async overview(query: ModerationAnalyticsQueryDto) {
    const { from, to } = this.window(query);
    const bucket = this.bucketExpression(query.granularity ?? 'day');
    const topN = query.topN ?? 10;

    const [
      reportsOverTime,
      reportsByType,
      violationCategories,
      resolutionStats,
      moderatorActivity,
      appealStats,
      removalTrends,
      severityBreakdown,
      statusBreakdown,
    ] = await Promise.all([
      this.reportsOverTime(from, to, bucket, query.moderatorId),
      this.reportsByTargetType(from, to, query.moderatorId),
      this.topViolationCategories(from, to, topN),
      this.resolutionStats(from, to, query.moderatorId),
      this.moderatorActivity(from, to, topN),
      this.appealStats(from, to),
      this.contentRemovalTrends(from, to, bucket),
      this.severityBreakdown(from, to, query.moderatorId),
      this.statusBreakdown(query.moderatorId),
    ]);

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      granularity: query.granularity ?? 'day',
      reportsOverTime,
      reportsByType,
      violationCategories,
      resolutionStats,
      moderatorActivity,
      appealStats,
      removalTrends,
      severityBreakdown,
      statusBreakdown,
    };
  }

  /** Per-moderator scorecard: throughput, speed and appeal outcomes. */
  async moderatorScorecard(query: ModerationAnalyticsQueryDto) {
    const { from, to } = this.window(query);

    const rows = await this.dataSource.query(
      `
      WITH handled AS (
        SELECT
          c.resolved_by_id                          AS moderator_id,
          COUNT(*)::int                             AS handled,
          AVG(c.resolution_seconds)                 AS avg_seconds,
          COUNT(*) FILTER (WHERE c.status = 'RESOLVED')::int  AS upheld,
          COUNT(*) FILTER (WHERE c.status = 'DISMISSED')::int AS dismissed
        FROM incident_reports c
        WHERE c.resolved_by_id IS NOT NULL
          AND c.resolved_at BETWEEN $1 AND $2
        GROUP BY c.resolved_by_id
      ),
      pending AS (
        SELECT assigned_moderator_id AS moderator_id, COUNT(*)::int AS pending
        FROM incident_reports
        WHERE assigned_moderator_id IS NOT NULL
          AND status NOT IN ('RESOLVED', 'DISMISSED', 'CLOSED', 'DUPLICATE')
        GROUP BY assigned_moderator_id
      ),
      overturned AS (
        SELECT c.resolved_by_id AS moderator_id, COUNT(*)::int AS overturned
        FROM moderation_appeals a
        JOIN incident_reports c ON c.id = a.incident_report_id
        WHERE a.status = 'ACCEPTED'
          AND a.reviewed_at BETWEEN $1 AND $2
        GROUP BY c.resolved_by_id
      )
      SELECT
        u.id                                   AS "moderatorId",
        u.full_name                            AS "fullName",
        u.role                                 AS role,
        COALESCE(h.handled, 0)                 AS handled,
        COALESCE(h.upheld, 0)                  AS upheld,
        COALESCE(h.dismissed, 0)               AS dismissed,
        COALESCE(p.pending, 0)                 AS pending,
        COALESCE(o.overturned, 0)              AS "appealsOverturned",
        ROUND(COALESCE(h.avg_seconds, 0))::int AS "averageResolutionSeconds"
      FROM users u
      LEFT JOIN handled    h ON h.moderator_id = u.id
      LEFT JOIN pending    p ON p.moderator_id = u.id
      LEFT JOIN overturned o ON o.moderator_id = u.id
      WHERE u.role IN ('MODERATOR', 'SENIOR_MODERATOR', 'ORG_ADMIN', 'SYSTEM_ADMIN')
        AND u.deleted_at IS NULL
        AND (COALESCE(h.handled, 0) > 0 OR COALESCE(p.pending, 0) > 0)
      ORDER BY handled DESC, "fullName" ASC
      `,
      [from, to],
    );

    return rows.map((row: Record<string, unknown>) => {
      const handled = Number(row.handled);
      const overturned = Number(row.appealsOverturned);

      return {
        ...row,
        handled,
        upheld: Number(row.upheld),
        dismissed: Number(row.dismissed),
        pending: Number(row.pending),
        appealsOverturned: overturned,
        averageResolutionSeconds: Number(row.averageResolutionSeconds),
        // "Accuracy" here means: decisions that survived appeal. It is a
        // proxy, not a quality judgement — an unappealed decision counts as
        // sound because no one contested it.
        accuracyPercent:
          handled > 0
            ? Math.round(((handled - overturned) / handled) * 1000) / 10
            : null,
      };
    });
  }

  // =======================================================================
  // Individual series
  // =======================================================================

  private async reportsOverTime(
    from: Date,
    to: Date,
    bucket: string,
    moderatorId?: string,
  ): Promise<TimeSeriesPoint[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        ${bucket}                                              AS bucket,
        COUNT(*)::int                                          AS created,
        COUNT(*) FILTER (WHERE status = 'RESOLVED')::int       AS resolved,
        COUNT(*) FILTER (WHERE status = 'DISMISSED')::int      AS dismissed,
        COUNT(*) FILTER (WHERE status = 'ESCALATED')::int      AS escalated
      FROM incident_reports
      WHERE created_at BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR assigned_moderator_id = $3::uuid)
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [from, to, moderatorId ?? null],
    );

    return rows.map(this.normaliseBucket);
  }

  private async reportsByTargetType(
    from: Date,
    to: Date,
    moderatorId?: string,
  ) {
    const rows = await this.dataSource.query(
      `
      SELECT target_type AS name, COUNT(*)::int AS value
      FROM incident_reports
      WHERE created_at BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR assigned_moderator_id = $3::uuid)
      GROUP BY target_type
      ORDER BY value DESC
      `,
      [from, to, moderatorId ?? null],
    );

    return rows.map((r: { name: string; value: string }) => ({
      name: r.name,
      value: Number(r.value),
    }));
  }

  /**
   * Most-applied flags. Uses the flags moderators actually applied rather than
   * the reason the reporter chose, because the moderator's conclusion is the
   * more reliable category.
   */
  private async topViolationCategories(from: Date, to: Date, topN: number) {
    const rows = await this.dataSource.query(
      `
      SELECT f.code AS name, f.label AS label, f.color AS color,
             f.severity AS severity, COUNT(*)::int AS value
      FROM moderation_flag_assignments fa
      JOIN moderation_flags f ON f.id = fa.flag_id
      WHERE fa.created_at BETWEEN $1 AND $2
      GROUP BY f.code, f.label, f.color, f.severity
      ORDER BY value DESC
      LIMIT $3
      `,
      [from, to, topN],
    );

    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      value: Number(r.value),
    }));
  }

  private async resolutionStats(from: Date, to: Date, moderatorId?: string) {
    const [row] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)::int                                       AS total,
        COUNT(*) FILTER (WHERE status = 'RESOLVED')::int    AS upheld,
        COUNT(*) FILTER (WHERE status = 'DISMISSED')::int   AS dismissed,
        COUNT(*) FILTER (WHERE status = 'DUPLICATE')::int   AS duplicates,
        ROUND(AVG(resolution_seconds))::int                 AS "averageSeconds",
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY resolution_seconds))::int                AS "medianSeconds",
        ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY resolution_seconds))::int                AS "p90Seconds"
      FROM incident_reports
      WHERE resolved_at BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR resolved_by_id = $3::uuid)
      `,
      [from, to, moderatorId ?? null],
    );

    return {
      total: Number(row?.total ?? 0),
      upheld: Number(row?.upheld ?? 0),
      dismissed: Number(row?.dismissed ?? 0),
      duplicates: Number(row?.duplicates ?? 0),
      averageSeconds: row?.averageSeconds ? Number(row.averageSeconds) : null,
      medianSeconds: row?.medianSeconds ? Number(row.medianSeconds) : null,
      p90Seconds: row?.p90Seconds ? Number(row.p90Seconds) : null,
    };
  }

  private async moderatorActivity(from: Date, to: Date, topN: number) {
    const rows = await this.dataSource.query(
      `
      SELECT
        u.id        AS "moderatorId",
        u.full_name AS name,
        COUNT(*)::int AS value
      FROM moderation_actions a
      JOIN users u ON u.id = a.moderator_user_id
      WHERE a.created_at BETWEEN $1 AND $2
      GROUP BY u.id, u.full_name
      ORDER BY value DESC
      LIMIT $3
      `,
      [from, to, topN],
    );

    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      value: Number(r.value),
    }));
  }

  private async appealStats(from: Date, to: Date) {
    const rows = await this.appealRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)::int', 'value')
      .where('a.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('a.status')
      .getRawMany<{ status: AppealStatus; value: string }>();

    const byStatus = Object.fromEntries(
      rows.map((r) => [r.status, Number(r.value)]),
    ) as Record<AppealStatus, number>;

    const decided =
      (byStatus[AppealStatus.ACCEPTED] ?? 0) +
      (byStatus[AppealStatus.REJECTED] ?? 0);

    return {
      byStatus,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      decided,
      overturnRatePercent:
        decided > 0
          ? Math.round(
              ((byStatus[AppealStatus.ACCEPTED] ?? 0) / decided) * 1000,
            ) / 10
          : null,
    };
  }

  private async contentRemovalTrends(
    from: Date,
    to: Date,
    bucket: string,
  ): Promise<TimeSeriesPoint[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        ${bucket}                                                     AS bucket,
        COUNT(*) FILTER (WHERE action = 'CONTENT_HIDDEN')::int        AS hidden,
        COUNT(*) FILTER (WHERE action = 'CONTENT_DELETED')::int       AS deleted,
        COUNT(*) FILTER (WHERE action = 'CONTENT_RESTORED')::int      AS restored,
        COUNT(*) FILTER (WHERE action = 'CONTENT_FLAGGED')::int       AS flagged
      FROM moderation_actions
      WHERE created_at BETWEEN $1 AND $2
        AND action IN ('CONTENT_HIDDEN', 'CONTENT_DELETED',
                       'CONTENT_RESTORED', 'CONTENT_FLAGGED')
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [from, to],
    );

    return rows.map(this.normaliseBucket);
  }

  private async severityBreakdown(from: Date, to: Date, moderatorId?: string) {
    const rows = await this.dataSource.query(
      `
      SELECT severity AS name, COUNT(*)::int AS value
      FROM incident_reports
      WHERE created_at BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR assigned_moderator_id = $3::uuid)
      GROUP BY severity
      `,
      [from, to, moderatorId ?? null],
    );

    return rows.map((r: { name: string; value: string }) => ({
      name: r.name,
      value: Number(r.value),
    }));
  }

  /** Current queue composition — not windowed; it describes "right now". */
  private async statusBreakdown(moderatorId?: string) {
    const rows = await this.dataSource.query(
      `
      SELECT status AS name, COUNT(*)::int AS value
      FROM incident_reports
      WHERE ($1::uuid IS NULL OR assigned_moderator_id = $1::uuid)
      GROUP BY status
      `,
      [moderatorId ?? null],
    );

    return rows.map((r: { name: string; value: string }) => ({
      name: r.name,
      value: Number(r.value),
    }));
  }

  // =======================================================================
  // Export
  // =======================================================================

  /**
   * Flat rows for CSV/Excel export, and the source for the PDF summary.
   * Kept as plain objects so every format renders from the same data.
   */
  async exportRows(query: ModerationAnalyticsQueryDto) {
    const { from, to } = this.window(query);

    const rows = await this.caseRepo
      .createQueryBuilder('c')
      .leftJoin('c.assignedModerator', 'assignee')
      .leftJoin('c.reportedUser', 'reported')
      .select([
        'c.caseNumber   AS "caseNumber"',
        'c.status       AS status',
        'c.severity     AS severity',
        'c.reportReason AS reason',
        'c.targetType   AS "targetType"',
        'c.createdAt    AS "createdAt"',
        'c.resolvedAt   AS "resolvedAt"',
        'c.resolutionSeconds AS "resolutionSeconds"',
        'c.reopenCount  AS "reopenCount"',
        'assignee.fullName   AS "assignedTo"',
        'reported.username   AS "reportedUser"',
      ])
      .where('c.createdAt BETWEEN :from AND :to', { from, to })
      .orderBy('c.createdAt', 'DESC')
      .getRawMany();

    return rows;
  }

  // =======================================================================
  // Helpers
  // =======================================================================

  private window(query: ModerationAnalyticsQueryDto): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 86_400_000);

    return { from, to };
  }

  /**
   * `granularity` is validated against a fixed list by the DTO, so
   * interpolating it here cannot introduce injection.
   */
  private bucketExpression(granularity: AnalyticsGranularity): string {
    return `to_char(date_trunc('${granularity}', created_at), 'YYYY-MM-DD')`;
  }

  private normaliseBucket = (row: Record<string, unknown>): TimeSeriesPoint => {
    const out: TimeSeriesPoint = { bucket: String(row.bucket) };
    for (const [key, value] of Object.entries(row)) {
      if (key === 'bucket') continue;
      out[key] = Number(value);
    }
    return out;
  };
}
