import { IsOptional, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../../shared/enums/feedback-status.enum';
import { FeedbackPriority } from '../../shared/enums/feedback-priority.enum';
import { FeedbackType } from '../../shared/enums/feedback-type.enum';
import { Type, Transform } from 'class-transformer';

export class FeedbackQueryDto {
  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsOptional()