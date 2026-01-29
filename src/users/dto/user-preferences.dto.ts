import {
  IsObject,
  IsOptional,
  IsBoolean,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class NotificationPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()