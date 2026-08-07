import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationActionBaseDto } from './case-actions.dto';

export class WarnUserDto extends ModerationActionBaseDto {
  @ApiPropertyOptional({ description: 'Case this warning stems from.' })
  @IsUUID()
  @IsOptional()
  incidentReportId?: string;
}

export class SuspendUserDto extends ModerationActionBaseDto {
  @ApiPropertyOptional({
    description:
      'Suspension length in days. Omit (or send `permanent: true`) for a ' +
      'permanent suspension, which requires the BAN_USERS permission.',
    minimum: 1,
    maximum: 365,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  permanent?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'A ban also blocks re-registration with the same identity.',
  })
  @IsBoolean()
  @IsOptional()
  ban?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  incidentReportId?: string;
}

export class RestoreUserDto extends ModerationActionBaseDto {
  @ApiPropertyOptional({
    description:
      'Restore only this sanction. Omit to lift every active sanction on ' +
      'the account.',
  })
  @IsUUID()
  @IsOptional()
  sanctionId?: string;
}

export class CreateModeratorNoteDto {
  @ApiProperty({ description: 'Markdown body.' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'User ids to notify. Also parsed from @mentions in the body.',
  })
  @IsOptional()
  mentionedUserIds?: string[];
}

export class UpdateModeratorNoteDto {
  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  attachments?: string[];
}
