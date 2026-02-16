import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfile } from './entities/player-profile.entity';
import { Avatar } from './entities/avatar.entity';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';

@Injectable()
export class PlayersService {
    constructor(
        @InjectRepository(PlayerProfile)
        private playerProfileRepository: Repository<PlayerProfile>,
        @InjectRepository(Avatar)
        private avatarRepository: Repository<Avatar>,
    ) { }

    /**
     * Create a new player profile
     */
    async createProfile(userId: string, createDto: CreatePlayerProfileDto): Promise<PlayerProfile> {
        // Check if user already has a profile
        const existingProfile = await this.playerProfileRepository.findOne({
            where: { userId },
        });

        if (existingProfile) {
            throw new BadRequestException('Player profile already exists for this user');
        }

        // Verify avatar exists
        const avatar = await this.avatarRepository.findOne({
            where: { id: createDto.avatarId },
        });

        if (!avatar) {
            throw new NotFoundException(`Avatar with ID ${createDto.avatarId} not found`);
        }

        // Create profile
        const profile = this.playerProfileRepository.create({
            userId,
            ...createDto,
            trustScoreInitial: 50, // Default initial trust score
        });

        return this.playerProfileRepository.save(profile);
    }

    /**
     * Get player profile by user ID
     */
    async getProfile(userId: string): Promise<PlayerProfile> {
        const profile = await this.playerProfileRepository.findOne({
            where: { userId },
            relations: ['avatar', 'user'],
        });

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        return profile;
    }

    /**
     * Update player profile
     */
    async updateProfile(userId: string, updateDto: UpdatePlayerProfileDto): Promise<PlayerProfile> {
        const profile = await this.playerProfileRepository.findOne({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        // If avatar is being updated, verify it exists
        if (updateDto.avatarId) {
            const avatar = await this.avatarRepository.findOne({
                where: { id: updateDto.avatarId },
            });

            if (!avatar) {
                throw new NotFoundException(`Avatar with ID ${updateDto.avatarId} not found`);
            }
        }

        // Update profile
        Object.assign(profile, updateDto);
        return this.playerProfileRepository.save(profile);
    }

    /**
     * Complete onboarding
     */
    async completeOnboarding(userId: string): Promise<void> {
        const profile = await this.playerProfileRepository.findOne({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        profile.onboardingCompleted = true;
        profile.onboardingCompletedAt = new Date();
        await this.playerProfileRepository.save(profile);
    }

    /**
     * Get all available avatars
     */
    async getAvatars(): Promise<Avatar[]> {
        return this.avatarRepository.find({
            where: { isActive: true },
        });
    }

    /**
     * Get player statistics
     */
    /**
     * Get player statistics
     */
    async getPlayerStats(userId: string): Promise<any> {
        const profile = await this.getProfile(userId);
        const manager = this.playerProfileRepository.manager;

        // 1. Get Game Counts
        const stats = await manager
            .createQueryBuilder()
            .select('COUNT(id)', 'total')
            .addSelect("COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)", 'completed')
            .from('game_progress', 'gp')
            .where('gp.userId = :userId', { userId })
            .getRawOne();

        const gamesPlayed = parseInt(stats.total, 10) || 0;
        const gamesCompleted = parseInt(stats.completed, 10) || 0;

        // 2. Get Score (using query directly since we can't easily inject GamificationService due to circular dep)
        const scoreResult = await manager
            .createQueryBuilder()
            .select('SUM(score)', 'totalScore')
            .from('game_outcome', 'go')
            .where('userId = :userId', { userId })
            .getRawOne();

        const totalScore = parseInt(scoreResult.totalScore, 10) || 0;

        // 3. Get Badges Count
        const badgesCount = await manager
            .createQueryBuilder()
            .select('COUNT(id)', 'count')
            .from('user_badges', 'ub')
            .where('ub.userId = :userId', { userId })
            .getRawOne();

        const badgesEarned = parseInt(badgesCount.count, 10) || 0;

        // 4. Get Rank
        const rankResult = await manager
            .createQueryBuilder()
            .select('rank')
            .from('leaderboards', 'l')
            .where('l.userId = :userId', { userId })
            .andWhere("l.leaderboardType = 'GAME_SCORE'")
            .andWhere("l.period = 'ALL_TIME'")
            .getRawOne();

        return {
            userId,
            nickname: profile.nickname,
            trustScore: profile.trustScoreInitial, // TODO: Implement trust score dynamic calculation
            totalScore,
            onboardingCompleted: profile.onboardingCompleted,
            memberSince: profile.createdAt,
            gamesPlayed,
            gamesCompleted,
            badgesEarned,
            currentRank: rankResult ? rankResult.rank : null,
            winRate: gamesPlayed > 0 ? Math.round((gamesCompleted / gamesPlayed) * 100) : 0
        };
    }
}
