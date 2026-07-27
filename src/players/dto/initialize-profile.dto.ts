import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class InitializeProfileDto {
  @ApiProperty({ example: 'FactChecker99' })
  @IsString()