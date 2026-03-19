import { IsString, Length, IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlayerProfileDto {
  @ApiPropertyOptional({
    description: 'Player nickname',
    example: 'FactChecker99',
    minLength: 3,
    maxLength: 20,
  })