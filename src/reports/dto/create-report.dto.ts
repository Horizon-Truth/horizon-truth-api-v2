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