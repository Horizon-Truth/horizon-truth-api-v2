import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportTagDto {
  @ApiProperty({ example: 'Misinformation' })
  @IsString()
  @IsNotEmpty()