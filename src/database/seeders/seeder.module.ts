import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSeederService } from './game-seeder.service';
import { SystemSeederService } from './system-seeder.service';
import { ReportsSeederService } from './reports-seeder.service';
import { User } from '../../users/entities/user.entity';
import { Scenario } from '../../engine/entities/scenario.entity';
import { Scene } from '../../engine/entities/scene.entity';
import { SceneContent } from '../../engine/entities/scene-content.entity';
import { Avatar } from '../../players/entities/avatar.entity';
import { Badge } from '../../gamification/entities/badge.entity';
import { GameLevel } from '../../engine/entities/game-level.entity';
import { ReportTag } from '../../reports/entities/report-tag.entity';
import { Language } from '../../reports/entities/language.entity';

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
            ReportTag,
            Language,
        ]),
    ],
    providers: [GameSeederService, SystemSeederService, ReportsSeederService],
    exports: [GameSeederService, SystemSeederService, ReportsSeederService],
})
export class SeederModule { }
