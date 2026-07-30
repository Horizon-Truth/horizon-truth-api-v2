import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLearningProfileDto {
  @ApiPropertyOptional({
    description: 'Per-skill XP/accuracy counters, keyed by skill key',
    example: { 'source-verification': { xp: 48, correct: 4, total: 5 } },
  })
  @IsOptional()
  @IsObject()
  skillBook?: Record<string, { xp: number; correct: number; total: number }>;

  @ApiPropertyOptional({
    description: 'Confidence-vs-accuracy counters per confidence bucket',
    example: { certain: { correct: 6, total: 8 } },
  })
  @IsOptional()
  @IsObject()
  calibration?: Record<string, { correct: number; total: number }>;
}
