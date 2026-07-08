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
  scenarioId?: string;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiProperty({ example: 'Reviewer' })
  @IsString()
  commentSource: string;

  @ApiProperty({ example: 'This scenario is too easy.' })
  @IsString()
  commentText: string;

  @ApiPropertyOptional({ example: 'Increase difficulty of scene 2.' })
  @IsOptional()
  @IsString()
  requiredAction?: string;

  @ApiProperty({ enum: FeedbackPriority, default: FeedbackPriority.MEDIUM })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiProperty({ enum: FeedbackStatus, default: FeedbackStatus.OPEN })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiProperty({ enum: FeedbackType, default: FeedbackType.SCENARIO })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deadline?: Date;
}
