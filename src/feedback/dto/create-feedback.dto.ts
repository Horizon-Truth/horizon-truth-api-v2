import { IsString, IsEnum, IsOptional, IsUUID, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackPriority } from '../../shared/enums/feedback-priority.enum';
import { FeedbackStatus } from '../../shared/enums/feedback-status.enum';
import { FeedbackType } from '../../shared/enums/feedback-type.enum';