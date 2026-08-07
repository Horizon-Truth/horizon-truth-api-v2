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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';

import { ModerationUsersService } from '../services/moderation-users.service';
import { ModerationNotesService } from '../services/moderation-notes.service';
import {
  CreateModeratorNoteDto,
  RestoreUserDto,
  SuspendUserDto,
  UpdateModeratorNoteDto,
  WarnUserDto,
} from '../dto/user-actions.dto';
import { actorFromRequest } from '../moderation-actor';

/** User moderation: violation record, warnings, suspensions and restoration. */
@ApiTags('Moderation — Users')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModerationUsersController {
  constructor(
    private readonly users: ModerationUsersService,
    private readonly notes: ModerationNotesService,
  ) {}

  @Get('moderators')
  @RequirePermissions(ModerationPermission.ASSIGN_REPORTS)
  @ApiOperation({
    summary: 'Moderation staff and their current open-case load',
  })
  async listModerators() {
    return this.users.listModerators();
  }

  @Get('users/:id')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary:
      'Moderation profile: reports received, sanctions, appeals, notes, ' +
      'activity timeline and risk score',
  })
  async profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getModerationProfile(id);
  }

  @Post('users/:id/warn')
  @RequirePermissions(ModerationPermission.WARN_USERS)
  @ApiOperation({ summary: 'Issue a formal warning' })
  async warn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WarnUserDto,
    @Req() req: Request,
  ) {
    return this.users.warn(id, dto, actorFromRequest(req));
  }

  @Post('users/:id/suspend')
  @RequirePermissions(ModerationPermission.SUSPEND_USERS)
  @ApiOperation({
    summary: 'Suspend an account',
    description:
      'A temporary suspension needs `durationDays`. Permanent suspensions ' +
      'and bans need the BAN_USERS permission.',
  })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: Request,
  ) {
    return this.users.suspend(id, dto, actorFromRequest(req));
  }

  @Post('users/:id/restore')
  @RequirePermissions(ModerationPermission.RESTORE_USERS)
  @ApiOperation({ summary: 'Lift one sanction, or all active sanctions' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestoreUserDto,
    @Req() req: Request,
  ) {
    return this.users.restore(id, dto, actorFromRequest(req));
  }

  @Post('sanctions/expire-due')
  @RequirePermissions(ModerationPermission.RESTORE_USERS)
  @ApiOperation({
    summary: 'Expire temporary suspensions that have run their course',
    description:
      'Idempotent. Intended for a scheduled call, but safe to invoke from ' +
      'the dashboard.',
  })
  async expireDue() {
    return this.users.expireDueSanctions();
  }

  // --- Notes on a user ---------------------------------------------------

  @Get('users/:id/notes')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Private notes about this account' })
  async listNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('search') search?: string,
  ) {
    return this.notes.list(
      { targetType: ModerationTargetType.USER_PROFILE, targetId: id },
      { search },
    );
  }

  @Post('users/:id/notes')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Add a private note about this account' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModeratorNoteDto,
    @Req() req: Request,
  ) {
    return this.notes.create(
      { targetType: ModerationTargetType.USER_PROFILE, targetId: id },
      dto,
      actorFromRequest(req),
    );
  }
}

/** Note editing, shared by case notes and user notes. */
@ApiTags('Moderation — Notes')
@ApiBearerAuth()
@Controller('moderation/notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModerationNotesController {
  constructor(private readonly notes: ModerationNotesService) {}

  @Get(':id/revisions')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Edit history for a note' })
  async revisions(@Param('id', ParseUUIDPipe) id: string) {
    return this.notes.revisions(id);
  }

  @Patch(':id')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary: 'Edit a note',
    description: 'The previous body is kept as a revision.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModeratorNoteDto,
    @Req() req: Request,
  ) {
    return this.notes.update(id, dto, actorFromRequest(req));
  }

  @Delete(':id')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Soft-delete a note' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.notes.remove(id, actorFromRequest(req));
  }
}
