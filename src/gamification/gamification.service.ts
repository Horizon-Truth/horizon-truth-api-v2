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
  }

  /**
   * Get user's earned badges
   */
  async getUserBadges(userId: string): Promise<any> {
    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });

    return userBadges.map((ub) => ({
      id: ub.id,
      badgeCode: ub.badge.code,
      badgeName: ub.badge.name,
      description: ub.badge.description,
      iconUrl: ub.badge.iconUrl,
      category: ub.badge.category,
      earnedAt: ub.earnedAt,
      metadata: ub.metadata,
    }));
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(
    userId: string,
    badgeCode: string,
    metadata?: Record<string, any>,
  ): Promise<UserBadge> {
    // Find the badge
    const badge = await this.badgeRepository.findOne({
      where: { code: badgeCode },
    });

    if (!badge) {
      throw new NotFoundException(`Badge with code ${badgeCode} not found`);
    }

    // Check if user already has this badge
    const existingBadge = await this.userBadgeRepository.findOne({
      where: { userId, badgeId: badge.id },
    });

    if (existingBadge) {
      throw new BadRequestException('User already has this badge');
    }

    // Award the badge
    const userBadge = this.userBadgeRepository.create({
      userId,
      badgeId: badge.id,
      metadata,
    });

    return this.userBadgeRepository.save(userBadge);
  }

  /**
   * Check badge eligibility for a user after game completion
   */
  /**
   * Check badge eligibility based on a specific outcome (mid-scenario or final)
   */
  async checkOutcomeBadgeEligibility(
    userId: string,
    outcome: GameOutcome,
  ): Promise<any[]> {
    const awardedBadges: any[] = [];

    if (outcome.outcomeType !== OutcomeType.PASS) {
      return awardedBadges;
    }

    // Fetch scenario to check which one it is
    const scenario = await this.userBadgeRepository.manager.findOne(
      Scenario,
      {
        where: { id: outcome.scenarioId },
      },
    );