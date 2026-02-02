import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameLevel } from './entities/game-level.entity';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { SceneContent } from './entities/scene-content.entity';
import { SceneChatMessage } from './entities/scene-chat-message.entity';
import { SceneFeedItem } from './entities/scene-feed-item.entity';
import { PlayerChoice } from './entities/player-choice.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { GameProgress } from './entities/game-progress.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            GameLevel,
            Scenario,
            Scene,
            SceneContent,
            SceneChatMessage,
            SceneFeedItem,
            PlayerChoice,
            GameOutcome,
            GameProgress,
        ]),
    ],
    exports: [TypeOrmModule],
})
export class EngineModule { }
