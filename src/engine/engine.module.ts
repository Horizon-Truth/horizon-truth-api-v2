import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameLevel } from './entities/game-level.entity';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { SceneContent } from './entities/scene-content.entity';
import { SceneChatMessage } from './entities/scene-chat-message.entity';
import { SceneFeedItem } from './entities/scene-feed-item.entity';
import { PlayerChoice } from './entities/player-choice.entity';