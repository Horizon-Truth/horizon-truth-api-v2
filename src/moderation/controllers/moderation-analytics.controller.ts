import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import {
  ModerationPermission,
  permissionsForRole,
} from '../../shared/enums/moderation-permission.enum';

import { ModerationAnalyticsService } from '../services/moderation-analytics.service';
import { ModerationSavedFiltersService } from '../services/moderation-saved-filters.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  CreateSavedFilterDto,
  ExportAnalyticsQueryDto,
  ModerationAnalyticsQueryDto,
  UpdateSavedFilterDto,
} from '../dto/analytics.dto';
import { actorFromRequest } from '../moderation-actor';
import {
  EXPORT_MIME,
  toCsv,
  toExcelXml,
  toPdf,
} from '../../shared/utils/tabular-export';

/** Entity types the moderation audit view is allowed to surface. */
const MODERATION_ENTITY_TYPES = [
  'moderation_case',
  'moderation_note',
  'moderation_appeal',
  'user',
];

@ApiTags('Moderation — Analytics & Audit')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModerationAnalyticsController {
  constructor(
    private readonly analytics: ModerationAnalyticsService,
    private readonly savedFilters: ModerationSavedFiltersService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Get('permissions')
  @RequirePermissions(ModerationPermission.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'The caller’s moderation capabilities',
    description:
      'The client uses this to hide actions the user cannot perform. It is a ' +
      'convenience, not the enforcement point — every endpoint re-checks.',
  })
  async permissions(@Req() req: Request) {
    const actor = actorFromRequest(req);
    return {
      role: actor.role,
      permissions: permissionsForRole(actor.role),
    };
  }

  @Get('analytics')
  @RequirePermissions(ModerationPermission.VIEW_ANALYTICS)
  @ApiOperation({
    summary: 'Charts: volume, categories, resolution, activity, appeals',
  })
  async overview(@Query() query: ModerationAnalyticsQueryDto) {
    return this.analytics.overview(query);
  }

  @Get('analytics/moderators')
  @RequirePermissions(ModerationPermission.VIEW_ANALYTICS)
  @ApiOperation({
    summary: 'Per-moderator throughput, speed, workload and appeal outcomes',
  })
  async moderators(@Query() query: ModerationAnalyticsQueryDto) {
    return this.analytics.moderatorScorecard(query);
  }

  @Get('analytics/export')
  @RequirePermissions(ModerationPermission.EXPORT_DATA)
  @ApiOperation({
    summary: 'Export the case register as CSV, Excel or PDF',
  })
  async export(@Query() query: ExportAnalyticsQueryDto, @Res() res: Response) {
    const rows = await this.analytics.exportRows(query);
    const format = query.format ?? 'csv';
    const stamp = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const summary = await this.analytics.overview(query);
      const buffer = toPdf(rows, undefined, {
        title: 'Horizon Truth — Moderation Report',
        subtitle: `${summary.window.from.split('T')[0]} to ${
          summary.window.to.split('T')[0]
        }`,
        summary: [
          `Cases in window: ${rows.length}`,
          `Upheld: ${summary.resolutionStats.upheld}   ` +
            `Dismissed: ${summary.resolutionStats.dismissed}`,
          `Median resolution: ${formatDuration(
            summary.resolutionStats.medianSeconds,
          )}`,
          `Appeal overturn rate: ${
            summary.appealStats.overturnRatePercent ?? 0
          }%`,
        ],
      });

      res.set({
        'Content-Type': EXPORT_MIME.pdf.type,
        'Content-Disposition': `attachment; filename=moderation-report-${stamp}.pdf`,
      });
      return res.send(buffer);
    }

    if (format === 'xlsx') {
      res.set({
        'Content-Type': EXPORT_MIME.xlsx.type,
        'Content-Disposition': `attachment; filename=moderation-report-${stamp}.${EXPORT_MIME.xlsx.extension}`,
      });
      return res.send(toExcelXml(rows, undefined, 'Moderation'));
    }

    res.set({
      'Content-Type': EXPORT_MIME.csv.type,
      'Content-Disposition': `attachment; filename=moderation-report-${stamp}.csv`,
    });
    return res.send(toCsv(rows));
  }

  // --- Audit -------------------------------------------------------------

  @Get('audit')
  @RequirePermissions(ModerationPermission.VIEW_AUDIT)
  @ApiOperation({
    summary: 'Searchable moderation audit trail',
    description:
      'Scoped to moderation entity types. The unrestricted platform-wide ' +
      'trail remains at /audit-logs, which is SYSTEM_ADMIN only.',
  })
  async audit(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Callers may narrow to one moderation entity type, but not widen beyond
    // the moderation set.
    const scoped =
      entityType && MODERATION_ENTITY_TYPES.includes(entityType)
        ? entityType
        : undefined;

    const result = await this.auditLogs.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      userId,
      action: action ?? (scoped ? undefined : 'MODERATION'),
      entityType: scoped,
      entityId,
      search,
      from,
      to,
    });

    return result;
  }

  // --- Saved filters -----------------------------------------------------

  @Get('saved-filters')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Your saved queue views, plus shared ones' })
  async listFilters(@Req() req: Request) {
    return this.savedFilters.listFor(actorFromRequest(req));
  }

  @Post('saved-filters')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Save the current queue query as a named view' })
  async createFilter(@Body() dto: CreateSavedFilterDto, @Req() req: Request) {
    return this.savedFilters.create(dto, actorFromRequest(req));
  }

  @Patch('saved-filters/:id')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Rename or retarget a saved view' })
  async updateFilter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedFilterDto,
    @Req() req: Request,
  ) {
    return this.savedFilters.update(id, dto, actorFromRequest(req));
  }

  @Delete('saved-filters/:id')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Delete a saved view' })
  async removeFilter(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.savedFilters.remove(id, actorFromRequest(req));
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'n/a';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86_400).toFixed(1)}d`;
}
