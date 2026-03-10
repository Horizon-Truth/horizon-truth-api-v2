import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';

export class CreateScenarioDto {
  @ApiProperty({ example: 'The Viral Hoax' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'A scenario about identifying fake news on social media.',
  })
  @IsString()
  description: string;

  @ApiProperty({ enum: ScenarioType })
  @IsEnum(ScenarioType)
  type: ScenarioType;

  @ApiProperty({ enum: ScenarioDifficulty })
  @IsEnum(ScenarioDifficulty)
  difficulty: ScenarioDifficulty;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ example: 'Learn to identify phishing attempts' })
  @IsOptional()
  @IsString()
  learningObjective?: string;

  @ApiPropertyOptional({ example: 'High risk of data leakage' })
  @IsOptional()
  @IsString()
  behavioralRisk?: string;

  @ApiPropertyOptional({ example: 'Fear of missing out (FOMO)' })
  @IsOptional()
  @IsString()
  psychologicalTrigger?: string;

  @ApiPropertyOptional({ example: 'Always verify the sender address' })
  @IsOptional()
  @IsString()
  preventionLesson?: string;

  @ApiPropertyOptional({ example: 'Cybersecurity' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({ example: 70 })
  @IsOptional()
  @IsInt()
  minimumScore?: number;

  @ApiProperty({ example: 5 })
  @IsOptional()
  @IsInt()
  totalScenes?: number;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'UUID of scenario that must be passed before this one unlocks' })
  @IsOptional()
  @IsUUID()
  unlockScenarioId?: string;

  @ApiPropertyOptional({ example: 'MISINFORMATION_101', description: 'Campaign tag for grouping scenarios' })
  @IsOptional()
  @IsString()
  campaignTag?: string;
}
