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

import { ModerationFlagsService } from '../services/moderation-flags.service';
import { CreateFlagDto, UpdateFlagDto } from '../dto/flag-catalogue.dto';
import { RemoveFlagDto } from '../dto/case-actions.dto';
import { actorFromRequest } from '../moderation-actor';

@ApiTags('Moderation — Flags')
@ApiBearerAuth()
@Controller('moderation/flags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModerationFlagsController {
  constructor(private readonly flags: ModerationFlagsService) {}

  @Get()
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({
    summary: 'The flag catalogue',
    description:
      'Active flags by default. Pass `includeInactive=true` to see retired ' +
      'flags when auditing historical decisions.',
  })
  async list(@Query('includeInactive') includeInactive?: string) {
    return this.flags.listCatalogue(includeInactive === 'true');
  }

  @Post()
  @RequirePermissions(ModerationPermission.MANAGE_FLAGS)
  @ApiOperation({ summary: 'Add a custom flag to the catalogue' })
  async create(@Body() dto: CreateFlagDto) {
    return this.flags.createFlag(dto);
  }

  @Patch(':id')
  @RequirePermissions(ModerationPermission.MANAGE_FLAGS)
  @ApiOperation({
    summary: 'Retune a flag’s label, colour, icon, severity or translations',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlagDto,
  ) {
    return this.flags.updateFlag(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(ModerationPermission.MANAGE_FLAGS)
  @ApiOperation({
    summary: 'Remove a flag',
    description:
      'System flags, and any flag already applied to content, are ' +
      'deactivated rather than deleted so historical decisions stay readable.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.flags.deleteFlag(id);
  }

  @Get('target/:targetType/:targetId')
  @RequirePermissions(ModerationPermission.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Flags currently on a target' })
  async forTarget(
    @Param('targetType') targetType: ModerationTargetType,
    @Param('targetId') targetId: string,
    @Query('includeRemoved') includeRemoved?: string,
  ) {
    return this.flags.flagsFor(targetType, targetId, includeRemoved === 'true');
  }

  @Post('assignments/:assignmentId/remove')
  @RequirePermissions(ModerationPermission.FLAG_CONTENT)
  @ApiOperation({ summary: 'Clear a flag from a target' })
  async removeAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: RemoveFlagDto,
    @Req() req: Request,
  ) {
    return this.flags.removeFlag(
      assignmentId,
      actorFromRequest(req),
      dto.reason,
    );
  }
}
