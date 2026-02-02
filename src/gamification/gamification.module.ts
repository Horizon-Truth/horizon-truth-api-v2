import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Leaderboard } from './entities/leaderboard.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Badge,
            UserBadge,
            Leaderboard,
        ]),
    ],
    exports: [TypeOrmModule],
})
export class GamificationModule { }
