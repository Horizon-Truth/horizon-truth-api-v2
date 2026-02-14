import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
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

        return userBadges.map(ub => ({
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
    async awardBadge(userId: string, badgeCode: string, metadata?: Record<string, any>): Promise<UserBadge> {
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
     * Check badge eligibility for a user after game completion
     */
    async checkBadgeEligibility(userId: string): Promise<string[]> {
        const awardedBadges: string[] = [];
        const manager = this.userBadgeRepository.manager;

        // Get user's existing badges
        const existingUserBadges = await this.userBadgeRepository.find({
            where: { userId },
            relations: ['badge'],
        });
        const existingBadgeCodes = new Set(existingUserBadges.map(ub => ub.badge.code));

        // 1. Get Game Stats
        // Count completed games
        const completedGamesCount = await manager
            .createQueryBuilder()
            .select('COUNT(id)', 'count')
            .from('game_progress', 'gp')
            .where('gp.userId = :userId', { userId })
            .andWhere('gp.status = :status', { status: 'COMPLETED' })
            .getRawOne();

        const gamesCount = parseInt(completedGamesCount.count, 10) || 0;

        // Check for perfect scores
        const perfectScoresCount = await manager
            .createQueryBuilder()
            .select('COUNT(id)', 'count')
            .from('game_outcome', 'go')
            .where('go.userId = :userId', { userId })
            .andWhere('go.score >= :score', { score: 100 })
            .getRawOne();

        const perfectCount = parseInt(perfectScoresCount.count, 10) || 0;

        // 2. Define Badge Criteria
        const criteria = [
            { code: 'FIRST_GAME', Met: gamesCount >= 1 },
            { code: 'FACT_FINDER', Met: gamesCount >= 5 },
            { code: 'SCENARIO_MASTER', Met: gamesCount >= 10 },
            { code: 'PERFECT_SCORE', Met: perfectCount >= 1 },
        ];

        // 3. Process Awards
        for (const criterion of criteria) {
            if (criterion.Met && !existingBadgeCodes.has(criterion.code)) {
                try {
                    await this.awardBadge(userId, criterion.code);
                    awardedBadges.push(criterion.code);
                    existingBadgeCodes.add(criterion.code); // Prevent double awarding in same loop
                } catch (error) {
                    console.error(`Failed to award badge ${criterion.code}:`, error.message);
                }
            }
        }

        return awardedBadges;
    }

    /**
     * Get leaderboard with filters
     */
    async getLeaderboard(query: LeaderboardQueryDto): Promise<any> {
        const { type, period, limit = 100 } = query;

        const leaderboard = await this.leaderboardRepository.find({
            where: { leaderboardType: type, period },
            relations: ['user'],
            order: { rank: 'ASC' },
            take: limit,
        });

        return leaderboard.map((entry, index) => ({
            rank: entry.rank || index + 1,
            userId: entry.userId,
            username: entry.user?.username || 'Unknown',
            score: entry.score,
            calculatedAt: entry.calculatedAt,
        }));
    }

    /**
     * Get user's rank on leaderboard
     */
    async getUserRank(userId: string, type: LeaderboardType, period: LeaderboardPeriod): Promise<any> {
        const entry = await this.leaderboardRepository.findOne({
            where: { userId, leaderboardType: type, period },
        });

        if (!entry) {
            return {
                userId,
                type,
                period,
                rank: null,
                score: 0,
                message: 'Not ranked yet',
            };
        }

        return {
            userId,
            type,
            period,
            rank: entry.rank,
            score: entry.score,
        };
    }

    /**
     * Update leaderboard for a user (called after game completion)
     */
    async updateLeaderboard(userId: string): Promise<void> {
        // Calculate actual score from completed games
        const score = await this.calculateScore(userId);

        // Update or create leaderboard entry for ALL_TIME
        let entry = await this.leaderboardRepository.findOne({
            where: {
                userId,
                leaderboardType: LeaderboardType.GAME_SCORE,
                period: LeaderboardPeriod.ALL_TIME,
            },
        });

        if (entry) {
            entry.score += score;
            await this.leaderboardRepository.save(entry);
        } else {
            entry = this.leaderboardRepository.create({
                userId,
                leaderboardType: LeaderboardType.GAME_SCORE,
                period: LeaderboardPeriod.ALL_TIME,
                score,
            });
            await this.leaderboardRepository.save(entry);
        }

        // Recalculate ranks (simple approach - in production, use a cron job)
        await this.recalculateRanks(LeaderboardType.GAME_SCORE, LeaderboardPeriod.ALL_TIME);
    }

    /**
     * Recalculate ranks for a leaderboard
     */
    private async recalculateRanks(type: LeaderboardType, period: LeaderboardPeriod): Promise<void> {
        const entries = await this.leaderboardRepository.find({
            where: { leaderboardType: type, period },
            order: { score: 'DESC' },
        });

        for (let i = 0; i < entries.length; i++) {
            entries[i].rank = i + 1;
        }

        await this.leaderboardRepository.save(entries);
    }

    /**
     * Calculate total score for a user
     */
    /**
     * Calculate total score for a user
     */
    async calculateScore(userId: string): Promise<number> {
        const result = await this.leaderboardRepository.manager
            .createQueryBuilder()
            .select('SUM(go.score)', 'totalScore')
            .from('game_outcome', 'go')
            .where('go.userId = :userId', { userId })
            .getRawOne();

        return parseInt(result.totalScore, 10) || 0;
    }

    // Admin Methods

    async createBadge(createDto: CreateBadgeDto): Promise<Badge> {
        const badge = this.badgeRepository.create(createDto);
        return this.badgeRepository.save(badge);
    }

    async updateBadge(id: string, updateDto: UpdateBadgeDto): Promise<Badge> {
        await this.badgeRepository.update(id, updateDto);
        const updated = await this.badgeRepository.findOne({ where: { id } });
        if (!updated) throw new NotFoundException('Badge not found');
        return updated;
    }

    async deleteBadge(id: string): Promise<void> {
        const result = await this.badgeRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Badge not found');
    }
}
