import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSeederService } from './game-seeder.service';
import { SystemSeederService } from './system-seeder.service';
import { User } from '../../users/entities/user.entity';
import { Scenario } from '../../engine/entities/scenario.entity';
import { Scene } from '../../engine/entities/scene.entity';
import { SceneContent } from '../../engine/entities/scene-content.entity';
import { Avatar } from '../../players/entities/avatar.entity';
import { Badge } from '../../gamification/entities/badge.entity';
import { GameLevel } from '../../engine/entities/game-level.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Scenario,
            Scene,
            SceneContent,
            Avatar,
            Badge,
            GameLevel,
            User,
        ]),
    ],
    providers: [GameSeederService, SystemSeederService],
    exports: [GameSeederService, SystemSeederService],
})
export class SeederModule { }
