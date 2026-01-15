import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsBoolean, IsEnum, IsArray, ValidateNested, IsUUID, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { PlayerActionType } from '../../shared/enums/player-action-type.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

export class CreateGameOutcomeDto {
    @ApiProperty({ enum: OutcomeType })
    @IsEnum(OutcomeType)
    outcomeType: OutcomeType;

    @ApiPropertyOptional()
    @IsOptional()