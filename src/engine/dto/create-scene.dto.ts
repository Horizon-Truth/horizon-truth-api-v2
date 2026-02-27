import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { PlayerActionType } from '../../shared/enums/player-action-type.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

export class CreateGameOutcomeDto {
    @ApiProperty({ enum: OutcomeType })
    outcomeType: OutcomeType;

    @ApiPropertyOptional()
    score?: number;

    @ApiPropertyOptional()
    trustScoreDelta?: number;

    @ApiPropertyOptional()
    message?: string;

    @ApiPropertyOptional()
    endScenario?: boolean;
}

export class CreatePlayerChoiceDto {
    @ApiProperty()
    label: string;

    @ApiProperty({ enum: PlayerActionType, required: false })
    actionType?: PlayerActionType;

    @ApiPropertyOptional()
    nextSceneId?: string;

    @ApiProperty({ type: () => CreateGameOutcomeDto, isArray: true, required: false })
    outcomes?: CreateGameOutcomeDto[];
}

export class CreateSceneContentDto {
    @ApiProperty({ enum: SceneContentType })
    contentType: SceneContentType;

    @ApiPropertyOptional()
    textBody?: string;

    @ApiPropertyOptional()
    imageUrl?: string;

    @ApiPropertyOptional()
    videoUrl?: string;

    @ApiPropertyOptional()
    audioUrl?: string;

    @ApiPropertyOptional()
    documentUrl?: string;

    @ApiPropertyOptional()
    metadata?: any;
}

export class CreateSceneDto {
    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiProperty()
    order: number;

    @ApiPropertyOptional()
    sceneType?: string;

    @ApiProperty({ enum: SceneContentType })
    contentType: SceneContentType;

    @ApiPropertyOptional()
    isTerminal?: boolean;

    @ApiProperty()
    content: CreateSceneContentDto;

    @ApiProperty({ type: () => CreatePlayerChoiceDto, isArray: true, required: false })
    choices?: CreatePlayerChoiceDto[];
}
