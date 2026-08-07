import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModerationNotificationsService } from '../services/moderation-notifications.service';
import { actorFromRequest } from '../moderation-actor';

class MarkReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  ids?: string[];
}

/**
 * The signed-in user's moderation inbox.
 *
 * Not permission-guarded: every recipient — moderator or sanctioned player —
 * reads their own notifications and nobody else's, which the service enforces
 * by scoping every query to `recipientId`.
 */
@ApiTags('Moderation — Notifications')
@ApiBearerAuth()
@Controller('moderation/notifications')
@UseGuards(JwtAuthGuard)
export class ModerationNotificationsController {
  constructor(private readonly notifications: ModerationNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Your moderation notifications' })
  async list(
    @Req() req: Request,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = actorFromRequest(req);
    return this.notifications.listFor(actor.userId, {
      unreadOnly: unreadOnly === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Badge count for the header' })
  async unreadCount(@Req() req: Request) {
    const actor = actorFromRequest(req);
    return { count: await this.notifications.unreadCount(actor.userId) };
  }

  @Post('read')
  @ApiOperation({
    summary: 'Mark notifications read',
    description: 'Omit `ids` to mark every unread notification read.',
  })
  async markRead(@Body() dto: MarkReadDto, @Req() req: Request) {
    const actor = actorFromRequest(req);

    return dto.ids?.length
      ? this.notifications.markRead(actor.userId, dto.ids)
      : this.notifications.markAllRead(actor.userId);
  }
}
