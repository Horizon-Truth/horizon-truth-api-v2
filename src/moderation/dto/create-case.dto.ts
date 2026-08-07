import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';

/** Payload a reporting user submits to raise a moderation case. */
export class CreateCaseDto {
  @ApiProperty({ enum: ModerationTargetType })
  @IsEnum(ModerationTargetType)
  targetType: ModerationTargetType;

  @ApiPropertyOptional({
    description: 'Primary key of the reported object, when it is first-party.',
  })
  @IsString()
  @IsOptional()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Existing `contents` row, if any.' })
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Author of the reported content.' })
  @IsUUID()
  @IsOptional()
  reportedUserId?: string;

  @ApiProperty({ enum: IncidentReportReason })
  @IsEnum(IncidentReportReason)
  reportReason: IncidentReportReason;

  @ApiProperty({
    example: 'This scene image is a doctored photo presented as evidence.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Evidence URLs, screenshots and attached media.',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    enum: IncidentSeverity,
    description:
      'Reporter-suggested severity. Moderators may override it on review.',
  })
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}
