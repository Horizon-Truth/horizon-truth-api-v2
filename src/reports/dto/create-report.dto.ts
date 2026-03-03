import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportContentType } from '../../shared/enums/report-content-type.enum';
import { ReportPriorityLevel } from '../../shared/enums/report-priority-level.enum';

export class CreateReportDto {
  @ApiProperty({ example: 'Suspicious Article' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'This article contains false information about healthcare.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ReportContentType })
  @IsEnum(ReportContentType)
  contentType: ReportContentType;

  @ApiPropertyOptional({ example: 'https://example.com/fake-news' })
  @IsUrl()
  @IsOptional()
  sourceUrl?: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({
    enum: ReportPriorityLevel,
    default: ReportPriorityLevel.MEDIUM,
  })
  @IsEnum(ReportPriorityLevel)
  @IsOptional()
  priority?: ReportPriorityLevel;

  @ApiProperty({
    type: [String],
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];
}
