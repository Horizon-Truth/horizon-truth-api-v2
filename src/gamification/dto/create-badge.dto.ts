import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BadgeCategory } from '../../shared/enums/badge-category.enum';

export class CreateBadgeDto {
  @ApiProperty({ example: 'TRUTH_SEEKER' })
  @IsString()