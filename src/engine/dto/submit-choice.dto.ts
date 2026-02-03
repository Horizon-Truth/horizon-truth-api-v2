import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitChoiceDto {
  @ApiProperty({
    description: 'ID of the game progress session',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  progressId: string;

  @ApiProperty({
    description: 'ID of the current scene',
    example: 'a1b2c3d4-1234-5678-90ab-cdef12345678',