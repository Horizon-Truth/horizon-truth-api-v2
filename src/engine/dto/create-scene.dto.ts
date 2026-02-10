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
    @IsInt()
    score?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    trustScoreDelta?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    endScenario?: boolean;
}

export class CreatePlayerChoiceDto {
    @ApiProperty()
    @IsString()
    label: string;

    @ApiProperty({ enum: PlayerActionType, required: false })
    @IsOptional()
    @IsEnum(PlayerActionType)
    actionType?: PlayerActionType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    nextSceneId?: string;

    @ApiProperty({ type: () => CreateGameOutcomeDto, isArray: true, required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateGameOutcomeDto)
    outcomes?: CreateGameOutcomeDto[];

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @IsInt()
    scoreImpact?: number;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsInt()
    influenceImpact?: number;