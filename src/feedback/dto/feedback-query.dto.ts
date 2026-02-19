import { IsOptional, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../../shared/enums/feedback-status.enum';
import { FeedbackPriority } from '../../shared/enums/feedback-priority.enum';
import { FeedbackType } from '../../shared/enums/feedback-type.enum';
import { Type, Transform } from 'class-transformer';

export class FeedbackQueryDto {
    @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @IsOptional()
    @IsUUID()
    scenarioId?: string;

    @ApiPropertyOptional({ enum: FeedbackStatus })
    @IsOptional()
    @IsEnum(FeedbackStatus)
    @Transform(({ value }) => (value === '' ? undefined : value))
    status?: FeedbackStatus;

    @ApiPropertyOptional({ enum: FeedbackPriority })
    @IsOptional()
    @IsEnum(FeedbackPriority)
    @Transform(({ value }) => (value === '' ? undefined : value))
    priority?: FeedbackPriority;

    @ApiPropertyOptional({ enum: FeedbackType })
    @IsOptional()
    @IsEnum(FeedbackType)
    @Transform(({ value }) => (value === '' ? undefined : value))
    type?: FeedbackType;

    @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @IsOptional()
    @IsUUID()
    @Transform(({ value }) => (value === '' ? undefined : value))
    assignedTo?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 10;
}
