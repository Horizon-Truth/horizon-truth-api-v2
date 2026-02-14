import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameLevel } from './entities/game-level.entity';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { SceneContent } from './entities/scene-content.entity';
import { SceneChatMessage } from './entities/scene-chat-message.entity';
import { SceneFeedItem } from './entities/scene-feed-item.entity';
import { PlayerChoice } from './entities/player-choice.entity';
import { PlayerAction } from './entities/player-action.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { GameProgress } from './entities/game-progress.entity';
import { EngineService } from './engine.service';
import { EngineController } from './engine.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { ScenarioAdminController } from './admin/scenario-admin.controller';

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
            PlayerAction,
            GameOutcome,
            GameProgress,
        ]),
        forwardRef(() => GamificationModule),
    ],
    controllers: [EngineController, ScenarioAdminController],
    providers: [EngineService],
    exports: [EngineService, TypeOrmModule],
})
export class EngineModule { }
