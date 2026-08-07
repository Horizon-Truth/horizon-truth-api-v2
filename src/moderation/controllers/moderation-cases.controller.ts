import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';

import { ModerationCasesService } from '../services/moderation-cases.service';
import { ModerationNotesService } from '../services/moderation-notes.service';
import { QueryCasesDto } from '../dto/query-cases.dto';
import { CreateCaseDto } from '../dto/create-case.dto';
import {
  ApplyFlagsDto,
  AssignCaseDto,
  CloseCaseDto,
  ContentActionDto,
  EscalateCaseDto,
  MergeCasesDto,
  ReopenCaseDto,
  ResolveCaseDto,
  ReviewCaseDto,
} from '../dto/case-actions.dto';
import { CreateModeratorNoteDto } from '../dto/user-actions.dto';
import { actorFromRequest } from '../moderation-actor';

/**
 * The moderation queue and case review API.
 *
 * Every route declares the capability it needs rather than a role list, so the
 * policy stays in `ROLE_PERMISSIONS` (see `moderation-permission.enum.ts`).
 */
@ApiTags('Moderation — Cases')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModerationCasesController {
  constructor(
    private readonly cases: ModerationCasesService,
    private readonly notes: ModerationNotesService,
  ) {}

  @Get('dashboard')
  @RequirePermissions(ModerationPermission.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Overview cards for the moderation dashboard' })
  @ApiResponse({ status: 200, description: 'Aggregate counts and averages.' })
  async dashboard() {
    return this.cases.dashboardOverview();
  }

  @Get('reports')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Search, filter, sort and paginate the queue' })
  async findAll(@Query() query: QueryCasesDto, @Req() req: Request) {
    return this.cases.findAll(query, actorFromRequest(req));
  }

  @Get('reports/:id')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary:
      'Full case: details, content preview, flags, notes, duplicates and timeline',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.cases.findOne(id, actorFromRequest(req));
  }

  @Post('reports/:id/assign')
  @RequirePermissions(ModerationPermission.ASSIGN_REPORTS)
  @ApiOperation({
    summary: 'Claim a case, or assign it to another moderator',
    description:
      'Omitting `moderatorId` claims the case. Assigning to someone else ' +
      'additionally requires the ASSIGN_OTHERS permission.',
  })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCaseDto,
    @Req() req: Request,
  ) {
    return this.cases.assign(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/review')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary: 'Take a case into review, or park it awaiting more information',
  })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCaseDto,
    @Req() req: Request,
  ) {
    return this.cases.review(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/flag')
  @RequirePermissions(ModerationPermission.FLAG_CONTENT)
  @ApiOperation({ summary: 'Apply one or more flags to the reported content' })
  async flag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyFlagsDto,
    @Req() req: Request,
  ) {
    return this.cases.applyFlags(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/resolve')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary: 'Close a case as upheld (RESOLVED) or unfounded (DISMISSED)',
  })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveCaseDto,
    @Req() req: Request,
  ) {
    return this.cases.resolve(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/reopen')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Return a decided case to the queue' })
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenCaseDto,
    @Req() req: Request,
  ) {
    return this.cases.reopen(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/close')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Mark a decided case as finished' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCaseDto,
    @Req() req: Request,
  ) {
    return this.cases.close(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/escalate')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary: 'Raise a case to a senior moderator or administrator',
  })
  async escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EscalateCaseDto,
    @Req() req: Request,
  ) {
    return this.cases.escalate(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/merge')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Fold duplicate cases into this one' })
  async merge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeCasesDto,
    @Req() req: Request,
  ) {
    return this.cases.merge(id, dto, actorFromRequest(req));
  }

  // --- Content actions taken from a case ---------------------------------

  @Post('reports/:id/content/hide')
  @RequirePermissions(ModerationPermission.HIDE_CONTENT)
  @ApiOperation({ summary: 'Hide the reported content from the public' })
  async hideContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContentActionDto,
    @Req() req: Request,
  ) {
    return this.cases.hideContent(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/content/delete')
  @RequirePermissions(ModerationPermission.DELETE_CONTENT)
  @ApiOperation({ summary: 'Soft-delete the reported content' })
  async deleteContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContentActionDto,
    @Req() req: Request,
  ) {
    return this.cases.deleteContent(id, dto, actorFromRequest(req));
  }

  @Post('reports/:id/content/restore')
  @RequirePermissions(ModerationPermission.RESTORE_CONTENT)
  @ApiOperation({ summary: 'Restore hidden or deleted content' })
  async restoreContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContentActionDto,
    @Req() req: Request,
  ) {
    return this.cases.restoreContent(id, dto, actorFromRequest(req));
  }

  // --- Notes on a case ---------------------------------------------------

  @Get('reports/:id/notes')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Private moderator notes on this case' })
  async listNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('search') search?: string,
  ) {
    return this.notes.list({ incidentReportId: id }, { search });
  }

  @Post('reports/:id/notes')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Add a private note to this case' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModeratorNoteDto,
    @Req() req: Request,
  ) {
    return this.notes.create(
      { incidentReportId: id },
      dto,
      actorFromRequest(req),
    );
  }
}

/**
 * Case intake, kept separate because reporting is a *player* capability: it
 * must not sit behind the moderation permission guard.
 */
@ApiTags('Moderation — Intake')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationIntakeController {
  constructor(private readonly cases: ModerationCasesService) {}

  @Post('report')
  @ApiOperation({ summary: 'Report content or a user for moderation' })
  @ApiResponse({ status: 201, description: 'The created case.' })
  async report(@Body() dto: CreateCaseDto, @Req() req: Request) {
    const actor = actorFromRequest(req);
    return this.cases.create(dto, actor.userId);
  }
}
