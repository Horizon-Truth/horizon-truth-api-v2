import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
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
}
