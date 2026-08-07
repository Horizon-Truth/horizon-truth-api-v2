import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppealStatus,
  AppealSubjectType,
} from '../../shared/enums/moderation-appeal.enum';

export class CreateAppealDto {
  @ApiProperty({ enum: AppealSubjectType })
  @IsEnum(AppealSubjectType)
  subjectType: AppealSubjectType;

  @ApiPropertyOptional({ description: 'Required for CASE appeals.' })
  @IsUUID()
  @IsOptional()
  incidentReportId?: string;

  @ApiPropertyOptional({ description: 'Required for SANCTION appeals.' })
  @IsUUID()
  @IsOptional()
  sanctionId?: string;

  @ApiProperty({
    example: 'The post was clearly labelled satire in the first line.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20, {
    message: 'Please explain the appeal in at least 20 characters',
  })
  @MaxLength(5000)
  reason: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  supportingEvidence?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class DecideAppealDto {
  @ApiProperty({
    enum: [AppealStatus.ACCEPTED, AppealStatus.REJECTED],
  })
  @IsEnum(AppealStatus)
  decision: AppealStatus.ACCEPTED | AppealStatus.REJECTED;

  @ApiProperty({
    description: 'Explanation sent to the appellant.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  moderatorResponse: string;
}

export class QueryAppealsDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: AppealStatus })
  @IsEnum(AppealStatus)
  @IsOptional()
  status?: AppealStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  appellantId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}
