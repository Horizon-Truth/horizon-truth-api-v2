import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlayerProfile } from './entities/player-profile.entity';
import { Avatar } from './entities/avatar.entity';
import { Region } from './entities/region.entity';
import { PlayerAlgorithmProfile } from '../analytics/entities/player-algorithm-profile.entity';
import { PlayerLearningProfile } from './entities/player-learning-profile.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PlayersService', () => {
  let service: PlayersService;
  let playerProfileRepository: any;
  let avatarRepository: any;