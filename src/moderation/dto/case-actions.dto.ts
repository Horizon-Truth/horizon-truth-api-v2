import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  MaxLength,
  MinLength,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';

/**
 * Every moderation action carries a reason. The UI collects it in the
 * confirmation dialog; the service rejects enforcement actions without one.
 */
export class ModerationActionBaseDto {
  @ApiProperty({
    example: 'Doctored image confirmed by reverse search; violates policy 4.2.',
    description: 'Policy justification. Recorded in the audit trail.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'reason must be at least 10 characters — it is a permanent record',
  })
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({ description: 'Free-form internal detail.' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}

export class AssignCaseDto extends ModerationActionBaseDto {
  @ApiPropertyOptional({
    description:
      'Target moderator. Omit to claim the case for yourself. Assigning to ' +
      'someone else requires the ASSIGN_OTHERS permission.',
  })
  @IsUUID()
  @IsOptional()
  moderatorId?: string;
}

export class ReviewCaseDto extends ModerationActionBaseDto {
  @ApiPropertyOptional({
    enum: IncidentSeverity,
    description: 'Moderator’s corrected severity, if different.',
  })
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiPropertyOptional({
    enum: [
      ModerationCaseStatus.UNDER_REVIEW,
      ModerationCaseStatus.AWAITING_INFO,
    ],
    description:
      'Where to move the case. Defaults to UNDER_REVIEW; use AWAITING_INFO ' +
      'when blocked on the reporter.',
  })
  @IsEnum(ModerationCaseStatus)
  @IsOptional()
  status?: ModerationCaseStatus;
}

export class ResolveCaseDto extends ModerationActionBaseDto {
  @ApiProperty({
    enum: [ModerationCaseStatus.RESOLVED, ModerationCaseStatus.DISMISSED],
    description:
      'RESOLVED upholds the report; DISMISSED rejects it as unfounded.',
  })
  @IsEnum(ModerationCaseStatus)
  outcome: ModerationCaseStatus.RESOLVED | ModerationCaseStatus.DISMISSED;
}

export class ReopenCaseDto extends ModerationActionBaseDto {}

export class CloseCaseDto extends ModerationActionBaseDto {}

export class EscalateCaseDto extends ModerationActionBaseDto {
  @ApiPropertyOptional({
    description:
      'Specific senior moderator or administrator to escalate to. Omit to ' +
      'place the case in the shared escalation queue.',
  })
  @IsUUID()
  @IsOptional()
  escalateToId?: string;
}

export class MergeCasesDto extends ModerationActionBaseDto {
  @ApiProperty({
    type: [String],
    description: 'Cases to fold into this one. They become DUPLICATE.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  duplicateIds: string[];
}

export class ApplyFlagsDto extends ModerationActionBaseDto {
  @ApiProperty({
    type: [String],
    example: ['MISINFORMATION', 'NEEDS_FACT_CHECK'],
    description: 'Flag codes from the catalogue.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  flagCodes: string[];
}

export class RemoveFlagDto extends ModerationActionBaseDto {}

export class ContentActionDto extends ModerationActionBaseDto {}
