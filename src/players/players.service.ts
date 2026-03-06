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