import { IsString, Length, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlayerProfileDto {
  @ApiProperty({
    description: 'Player nickname',