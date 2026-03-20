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
  let regionRepository: any;
  let algorithmProfileRepository: any;

  const mockPlayerProfileRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: {
        createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn(),
        })),
    },
  };

  const mockAvatarRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockRegionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockAlgorithmProfileRepository = {