import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfile } from './entities/player-profile.entity';
import { Avatar } from './entities/avatar.entity';
import { Region } from './entities/region.entity';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import { InitializeProfileDto } from './dto/initialize-profile.dto';
import { CreateAvatarDto } from './dto/create-avatar.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { PlayerAlgorithmProfile } from '../analytics/entities/player-algorithm-profile.entity';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(PlayerProfile)
    private playerProfileRepository: Repository<PlayerProfile>,
    @InjectRepository(Avatar)
    private avatarRepository: Repository<Avatar>,
    @InjectRepository(Region)
    private regionRepository: Repository<Region>,
    @InjectRepository(PlayerAlgorithmProfile)
    private algorithmProfileRepository: Repository<PlayerAlgorithmProfile>,
  ) { }

  /**
   * Create a new player profile
   */
  async createProfile(
    userId: string,
    createDto: CreatePlayerProfileDto,
  ): Promise<PlayerProfile> {
    // Check if user already has a profile
    const existingProfile = await this.playerProfileRepository.findOne({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException(
        'Player profile already exists for this user',
      );
    }

    // Verify avatar exists
    const avatar = await this.avatarRepository.findOne({
      where: { id: createDto.avatarId },
    });

    if (!avatar) {
      throw new NotFoundException(
        `Avatar with ID ${createDto.avatarId} not found`,
      );
    }

    // Create profile
    const profile = this.playerProfileRepository.create({
      userId,
      ...createDto,
      trustScoreInitial: 0, // Initial trust score for Level 0 logic
      currentTrustScore: 0,
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
  async updateProfile(
    userId: string,
    updateDto: UpdatePlayerProfileDto,
  ): Promise<PlayerProfile> {
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
        throw new NotFoundException(
          `Avatar with ID ${updateDto.avatarId} not found`,
        );
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
   * Initialize player profile during onboarding (Level 0)
   */
  async initializeProfile(
    userId: string,
    initializeDto: InitializeProfileDto,
  ): Promise<PlayerProfile> {
    let profile = await this.playerProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      // If No profile exists (shouldn't happen with auto-creation, but safe-guard)
      profile = this.playerProfileRepository.create({ userId });
    }

    // 1. Verify avatar exists
    const avatar = await this.avatarRepository.findOne({
      where: { id: initializeDto.avatarId },
    });

    if (!avatar) {
      throw new NotFoundException(
        `Avatar with ID ${initializeDto.avatarId} not found`,
      );
    }

    // 2. Verify region exists if provided
    if (initializeDto.fictionalRegionId) {
      const region = await this.regionRepository.findOne({
        where: { id: initializeDto.fictionalRegionId, isActive: true },
      });

      if (!region) {
        throw new NotFoundException(
          `Region with ID ${initializeDto.fictionalRegionId} not found`,
        );
      }
    }

    // 3. Update profile with onboarding data
    profile.nickname = initializeDto.nickname;
    profile.avatarId = initializeDto.avatarId;
    profile.fictionalRegionId = initializeDto.fictionalRegionId || null;
    profile.trustScoreInitial = 0;
    profile.currentTrustScore = 0;
    profile.onboardingCompleted = true;
    profile.onboardingCompletedAt = new Date();

    await this.playerProfileRepository.save(profile);

    // 3. Create initial algorithm profile if it doesn't exist
    const existingAlgoProfile = await this.algorithmProfileRepository.findOne({
      where: { userId },
    });

    if (!existingAlgoProfile) {
      const algoProfile = this.algorithmProfileRepository.create({
        userId,
        biasType: 'INITIAL',
        exposureScore: 0,
        panicSensitivity: 0,
      });
      await this.algorithmProfileRepository.save(algoProfile);
    }

    return this.getProfile(userId);
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
   * Get all available regions
   */
  async getRegions(): Promise<Region[]> {
    return this.regionRepository.find({
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
      .addSelect(
        "COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)",
        'completed',
      )
      .from('game_progress', 'gp')
      .where('gp.user_id = :userId', { userId })
      .getRawOne();

    const gamesPlayed = parseInt(stats.total, 10) || 0;
    const gamesCompleted = parseInt(stats.completed, 10) || 0;

    // 2. Get Score (using query directly since we can't easily inject GamificationService due to circular dep)
    const scoreResult = await manager
      .createQueryBuilder()
      .select('SUM(score)', 'totalScore')
      .from('game_outcomes', 'go')
      .where('go.user_id = :userId', { userId })
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
      winRate:
        gamesPlayed > 0 ? Math.round((gamesCompleted / gamesPlayed) * 100) : 0,
    };
  }
  /**
   * Get all player profiles (Admin only)
   */
  async findAllProfiles(query: any): Promise<any> {
    const { onboardingCompleted, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.playerProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.avatar', 'avatar')
      .leftJoinAndSelect('profile.user', 'user');

    if (onboardingCompleted !== undefined) {
      queryBuilder.andWhere(
        'profile.onboardingCompleted = :onboardingCompleted',
        { onboardingCompleted: onboardingCompleted === 'true' },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('profile.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update player profile by admin
   */
  async updateProfileByAdmin(userId: string, updateDto: any): Promise<any> {
    const profile = await this.playerProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Player profile not found');

    Object.assign(profile, updateDto);
    return this.playerProfileRepository.save(profile);
  }

  /**
   * Delete player profile by admin
   */
  async deleteProfileByAdmin(userId: string): Promise<void> {
    const result = await this.playerProfileRepository.delete({ userId });
    if (result.affected === 0)
      throw new NotFoundException('Player profile not found');
  }

  /**
   * Get all avatars for administration
   */
  async findAllAvatarsAdmin(query: any): Promise<any> {
    const { isActive, ageGroup, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.avatarRepository.createQueryBuilder('avatar');

    if (isActive !== undefined) {
      queryBuilder.andWhere('avatar.isActive = :isActive', {
        isActive: isActive === 'true',
      });
    }

    if (ageGroup) {
      queryBuilder.andWhere('avatar.ageGroup = :ageGroup', { ageGroup });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('avatar.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new avatar
   */
  async createAvatar(dto: CreateAvatarDto): Promise<Avatar> {
    const avatar = this.avatarRepository.create(dto);
    return this.avatarRepository.save(avatar);
  }

  /**
   * Update an avatar
   */
  async updateAvatar(id: string, dto: UpdateAvatarDto): Promise<Avatar> {
    const avatar = await this.avatarRepository.findOne({ where: { id } });
    if (!avatar) throw new NotFoundException('Avatar not found');

    Object.assign(avatar, dto);
    return this.avatarRepository.save(avatar);
  }

  /**
   * Delete an avatar
   */
  async deleteAvatar(id: string): Promise<void> {
    const result = await this.avatarRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Avatar not found');
  }
}
