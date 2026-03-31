import { IsOptional, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../../shared/enums/feedback-status.enum';
import { FeedbackPriority } from '../../shared/enums/feedback-priority.enum';
import { FeedbackType } from '../../shared/enums/feedback-type.enum';