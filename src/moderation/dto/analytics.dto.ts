import {
  IsOptional,
  IsUUID,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export const ANALYTICS_GRANULARITIES = ['day', 'week', 'month'] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class ModerationAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive start of the window. Defaults to 30 days ago.',
  })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end. Defaults to now.' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ enum: ANALYTICS_GRANULARITIES, default: 'day' })
  @IsIn(ANALYTICS_GRANULARITIES as unknown as string[])
  @IsOptional()
  granularity?: AnalyticsGranularity = 'day';

  @ApiPropertyOptional({ description: 'Scope to a single moderator.' })
  @IsUUID()
  @IsOptional()
  moderatorId?: string;

  @ApiPropertyOptional({
    default: 10,
    description: 'Top-N size for breakdowns.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  topN?: number = 10;
}

export class ExportAnalyticsQueryDto extends ModerationAnalyticsQueryDto {
  @ApiProperty({ enum: EXPORT_FORMATS, default: 'csv' })
  @IsIn(EXPORT_FORMATS as unknown as string[])
  @IsOptional()
  format?: ExportFormat = 'csv';
}

export class CreateSavedFilterDto {
  @ApiProperty({ example: 'Unassigned critical' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'AlertTriangle' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: 'A QueryCasesDto-shaped object.' })
  @IsObject()
  query: Record<string, unknown>;

  @ApiPropertyOptional({
    default: false,
    description: 'Share with every moderator. Requires MANAGE_FLAGS.',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateSavedFilterDto extends PartialType(CreateSavedFilterDto) {}
