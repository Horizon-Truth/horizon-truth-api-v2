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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';

import { ModerationAppealsService } from '../services/moderation-appeals.service';
import { ModerationUsersService } from '../services/moderation-users.service';
import {
  CreateAppealDto,
  DecideAppealDto,
  QueryAppealsDto,
} from '../dto/appeal.dto';
import { actorFromRequest } from '../moderation-actor';

/**
 * Appeal submission — available to any signed-in user, since the whole point
 * is that a sanctioned user can contest the decision.
 */
@ApiTags('Moderation — Appeals')
@ApiBearerAuth()
@Controller('moderation/appeals')
@UseGuards(JwtAuthGuard)
export class AppealSubmissionController {
  constructor(private readonly appeals: ModerationAppealsService) {}

  @Post()
  @ApiOperation({ summary: 'Appeal a moderation decision about you' })
  async submit(@Body() dto: CreateAppealDto, @Req() req: Request) {
    const actor = actorFromRequest(req);
    return this.appeals.submit(dto, actor.userId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Your own appeals and their outcomes' })
  async mine(@Req() req: Request) {
    const actor = actorFromRequest(req);
    return this.appeals.listMine(actor.userId);
  }
}

/**
 * A user's own moderation record.
 *
 * Authenticated but deliberately *not* permission-gated: the people who most
 * need this route are exactly the ones with no moderation capability. Every
 * query is scoped to the caller's own id, so there is nothing to widen.
 */
@ApiTags('Moderation — My record')
@ApiBearerAuth()
@Controller('moderation/me')
@UseGuards(JwtAuthGuard)
export class MyModerationRecordController {
  constructor(private readonly users: ModerationUsersService) {}

  @Get('record')
  @ApiOperation({
    summary: 'Sanctions and appeals concerning you',
    description:
      'Narrower than the moderator view: internal notes, the issuing ' +
      'moderator’s identity and the risk score are all withheld.',
  })
  async record(@Req() req: Request) {
    const actor = actorFromRequest(req);
    return this.users.getOwnRecord(actor.userId);
  }
}

/** Appeal review — restricted to staff holding REVIEW_APPEALS. */
@ApiTags('Moderation — Appeals')
@ApiBearerAuth()
@Controller('moderation/appeals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppealReviewController {
  constructor(private readonly appeals: ModerationAppealsService) {}

  @Get()
  @RequirePermissions(ModerationPermission.REVIEW_APPEALS)
  @ApiOperation({ summary: 'The appeals queue' })
  async findAll(@Query() query: QueryAppealsDto) {
    return this.appeals.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(ModerationPermission.REVIEW_APPEALS)
  @ApiOperation({ summary: 'One appeal, with its subject and appellant' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appeals.findOne(id);
  }

  @Post(':id/review')
  @RequirePermissions(ModerationPermission.REVIEW_APPEALS)
  @ApiOperation({
    summary: 'Claim an appeal for review',
    description:
      'Refused if you took the original decision — appeals are reviewed by ' +
      'someone else.',
  })
  async startReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.appeals.startReview(id, actorFromRequest(req));
  }

  @Post(':id/decide')
  @RequirePermissions(ModerationPermission.REVIEW_APPEALS)
  @ApiOperation({
    summary: 'Uphold or reject an appeal',
    description:
      'Upholding an appeal reverses the sanction and reopens the case it ' +
      'came from.',
  })
  async decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideAppealDto,
    @Req() req: Request,
  ) {
    return this.appeals.decide(id, dto, actorFromRequest(req));
  }
}
