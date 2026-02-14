import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { BadgeAdminController } from './admin/badge-admin.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Badge, UserBadge, Leaderboard]),
    ],
    controllers: [GamificationController, BadgeAdminController],
    providers: [GamificationService],
    exports: [GamificationService],
})
export class GamificationModule { }
