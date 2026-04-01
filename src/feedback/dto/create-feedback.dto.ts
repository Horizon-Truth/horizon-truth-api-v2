import { IsString, IsEnum, IsOptional, IsUUID, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackPriority } from '../../shared/enums/feedback-priority.enum';
import { FeedbackStatus } from '../../shared/enums/feedback-status.enum';
import { FeedbackType } from '../../shared/enums/feedback-type.enum';
import { Type } from 'class-transformer';

export class CreateFeedbackDto {
  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsOptional()
  @IsUUID()