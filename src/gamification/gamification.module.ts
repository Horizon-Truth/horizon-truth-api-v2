import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { Scenario } from '../engine/entities/scenario.entity';