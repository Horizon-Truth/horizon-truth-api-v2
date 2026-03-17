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
import { PlayerLearningProfile } from './entities/player-learning-profile.entity';
import { UpdateLearningProfileDto } from './dto/update-learning-profile.dto';
import {
  mergeSkillBooks,
  mergeCalibrations,
} from './learning-profile.util';

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
    @InjectRepository(PlayerLearningProfile)
    private learningProfileRepository: Repository<PlayerLearningProfile>,
  ) { }

  /**
   * Get the player's learning ledgers (skill book + confidence calibration).
   * Returns empty ledgers if the player has never synced.
   */
  async getLearningProfile(
    userId: string,
  ): Promise<Pick<PlayerLearningProfile, 'skillBook' | 'calibration'>> {
    const profile = await this.learningProfileRepository.findOne({
      where: { userId },
    });
    return {
      skillBook: profile?.skillBook ?? {},
      calibration: profile?.calibration ?? {},
    };
  }

  /**
   * Upsert the player's learning ledgers. Counters are monotonic, so incoming
   * data is merged element-wise-max with what's stored: a stale device can
   * never erase progress made elsewhere.
   */
  async upsertLearningProfile(
    userId: string,
    dto: UpdateLearningProfileDto,
  ): Promise<Pick<PlayerLearningProfile, 'skillBook' | 'calibration'>> {
    let profile = await this.learningProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      profile = this.learningProfileRepository.create({
        userId,
        skillBook: {},
        calibration: {},
      });
    }
    profile.skillBook = mergeSkillBooks(profile.skillBook, dto.skillBook);
    profile.calibration = mergeCalibrations(
      profile.calibration,
      dto.calibration,
    );
    const saved = await this.learningProfileRepository.save(profile);
    return { skillBook: saved.skillBook, calibration: saved.calibration };
  }

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