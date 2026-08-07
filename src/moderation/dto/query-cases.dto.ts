import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsIn,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';

const SORTABLE_COLUMNS = [
  'createdAt',
  'updatedAt',
  'severity',
  'status',
  'resolvedAt',
  'assignedAt',
] as const;

/** Query for the moderation queue. Also the persisted shape of a saved filter. */
export class QueryCasesDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Free text across case number, description and target preview.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ModerationCaseStatus,
    isArray: true,
    description: 'Repeatable, or comma-separated.',
  })
  @Transform(({ value }) => toArray(value))
  @IsEnum(ModerationCaseStatus, { each: true })
  @IsOptional()
  status?: ModerationCaseStatus[];

  @ApiPropertyOptional({ enum: IncidentSeverity, isArray: true })
  @Transform(({ value }) => toArray(value))
  @IsEnum(IncidentSeverity, { each: true })
  @IsOptional()
  severity?: IncidentSeverity[];

  @ApiPropertyOptional({ enum: IncidentReportReason, isArray: true })
  @Transform(({ value }) => toArray(value))
  @IsEnum(IncidentReportReason, { each: true })
  @IsOptional()
  reason?: IncidentReportReason[];

  @ApiPropertyOptional({ enum: ModerationTargetType, isArray: true })
  @Transform(({ value }) => toArray(value))
  @IsEnum(ModerationTargetType, { each: true })
  @IsOptional()
  targetType?: ModerationTargetType[];

  @ApiPropertyOptional({ description: 'Filter to one moderator’s workload.' })
  @IsUUID()
  @IsOptional()
  assignedModeratorId?: string;

  @ApiPropertyOptional({ description: 'Only cases with no owner.' })
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  @IsOptional()
  unassigned?: boolean;

  @ApiPropertyOptional({ description: 'Shorthand for the caller’s own queue.' })
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  @IsOptional()
  mine?: boolean;

  @ApiPropertyOptional({ description: 'Only cases still needing attention.' })
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  @IsOptional()
  openOnly?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reportedUserId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reporterId?: string;

  @ApiPropertyOptional({ description: 'Cases carrying this flag code.' })
  @IsString()
  @IsOptional()
  flagCode?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ enum: SORTABLE_COLUMNS, default: 'createdAt' })
  @IsIn(SORTABLE_COLUMNS as unknown as string[])
  @IsOptional()
  sortBy?: (typeof SORTABLE_COLUMNS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/** Accepts `?status=A&status=B` and `?status=A,B` alike. */
function toArray(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function toBool(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}
