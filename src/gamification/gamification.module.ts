import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { Scenario } from '../engine/entities/scenario.entity';
import { GameOutcome } from '../engine/entities/game-outcome.entity';
import { GameProgress } from '../engine/entities/game-progress.entity';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { BadgeAdminController } from './admin/badge-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Badge,
      UserBadge,
      Leaderboard,
      Scenario,
      GameOutcome,
      GameProgress,
    ]),
  ],
  controllers: [GamificationController, BadgeAdminController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule { }
