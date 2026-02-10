import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ContentLanguage } from '../../shared/enums/content-language.enum';

export class ScenarioQueryDto {
  @ApiPropertyOptional({
    description: