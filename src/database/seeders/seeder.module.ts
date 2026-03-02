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
import { Region } from '../../players/entities/region.entity';
import { Badge } from '../../gamification/entities/badge.entity';
import { GameLevel } from '../../engine/entities/game-level.entity';
import { ReportTag } from '../../reports/entities/report-tag.entity';
import { Language } from '../../reports/entities/language.entity';
import { PlayerChoice } from '../../engine/entities/player-choice.entity';
import { GameOutcome } from '../../engine/entities/game-outcome.entity';
import { Blog } from '../../blogs/entities/blog.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { BlogResourceSeederService } from './blog-resource-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Scenario,
      Scene,
      SceneContent,
      Avatar,
      Region,
      Badge,
      GameLevel,
      User,
      ReportTag,
      Language,
      PlayerChoice,
      GameOutcome,
      Blog,
      Resource,
    ]),
  ],
  providers: [
    GameSeederService,
    SystemSeederService,
    ReportsSeederService,
    BlogResourceSeederService,
  ],
  exports: [
    GameSeederService,
    SystemSeederService,
    ReportsSeederService,
    BlogResourceSeederService,
  ],
})
export class SeederModule { }
