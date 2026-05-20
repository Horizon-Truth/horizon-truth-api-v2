import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsUUID,
  IsArray,
  IsObject,
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

  @ApiPropertyOptional({ example: 'False Information' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'False Information' })
  @IsString()
  @IsOptional()