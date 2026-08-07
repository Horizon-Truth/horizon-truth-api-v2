import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Matches,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import {
  ModerationFlagType,
  ModerationFlagSeverity,
} from '../../shared/enums/moderation-flag-type.enum';

export class CreateFlagDto {
  @ApiProperty({
    example: 'ELECTION_INTEGRITY',
    description: 'Stable analytics key. Upper snake case.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]{2,49}$/, {
    message: 'code must be UPPER_SNAKE_CASE, 3–50 characters',
  })
  code: string;

  @ApiPropertyOptional({
    enum: ModerationFlagType,
    default: ModerationFlagType.CUSTOM,
  })
  @IsEnum(ModerationFlagType)
  @IsOptional()
  type?: ModerationFlagType;

  @ApiProperty({ example: 'Election Integrity' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label: string;

  @ApiProperty({ example: 'Content that misrepresents the voting process.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ enum: ModerationFlagSeverity })
  @IsEnum(ModerationFlagSeverity)
  @IsOptional()
  severity?: ModerationFlagSeverity;

  @ApiPropertyOptional({ example: 'amber' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'Vote', description: 'lucide-react icon.' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Localised overrides, e.g. { "am": { "label": "…" } }.',
  })
  @IsObject()
  @IsOptional()
  translations?: Record<string, { label?: string; description?: string }>;
}

/**
 * `code` is the analytics key and is immutable once created, so it is omitted
 * here — `whitelist: true` then strips it from any request that sends it.
 */
export class UpdateFlagDto extends PartialType(
  OmitType(CreateFlagDto, ['code'] as const),
) {}
