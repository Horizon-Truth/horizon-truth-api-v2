import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { GameOutcome } from '../engine/entities/game-outcome.entity';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { Scenario } from '../engine/entities/scenario.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { LeaderboardType } from '../shared/enums/leaderboard-type.enum';
import { LeaderboardPeriod } from '../shared/enums/leaderboard-period.enum';

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
  ) { }

  /**
   * Get all badges
   */
  async getBadges(): Promise<Badge[]> {
    return this.badgeRepository.find({
      where: { isActive: true },
    });