import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlayerProfile } from './entities/player-profile.entity';
import { Avatar } from './entities/avatar.entity';
import { Region } from './entities/region.entity';
import { PlayerAlgorithmProfile } from '../analytics/entities/player-algorithm-profile.entity';
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
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: getRepositoryToken(PlayerProfile),
          useValue: mockPlayerProfileRepository,
        },
        {
          provide: getRepositoryToken(Avatar),
          useValue: mockAvatarRepository,
        },
        {
          provide: getRepositoryToken(Region),
          useValue: mockRegionRepository,
        },
        {
          provide: getRepositoryToken(PlayerAlgorithmProfile),
          useValue: mockAlgorithmProfileRepository,
        },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    playerProfileRepository = module.get(getRepositoryToken(PlayerProfile));
    avatarRepository = module.get(getRepositoryToken(Avatar));
    regionRepository = module.get(getRepositoryToken(Region));
    algorithmProfileRepository = module.get(getRepositoryToken(PlayerAlgorithmProfile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    it('should throw BadRequestException if profile already exists', async () => {
      mockPlayerProfileRepository.findOne.mockResolvedValue({ id: '1' });
      await expect(service.createProfile('u1', { avatarId: 'a1' } as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if avatar is not found', async () => {
      mockPlayerProfileRepository.findOne.mockResolvedValue(null);
      mockAvatarRepository.findOne.mockResolvedValue(null);
      await expect(service.createProfile('u1', { avatarId: 'a1' } as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should create and save profile if valid', async () => {
      mockPlayerProfileRepository.findOne.mockResolvedValue(null);
      mockAvatarRepository.findOne.mockResolvedValue({ id: 'a1' });
      mockPlayerProfileRepository.create.mockReturnValue({ userId: 'u1', avatarId: 'a1' });
      mockPlayerProfileRepository.save.mockResolvedValue({ id: 'p1', userId: 'u1' });

      const result = await service.createProfile('u1', { avatarId: 'a1' } as any);

      expect(result.id).toBe('p1');
      expect(mockPlayerProfileRepository.save).toHaveBeenCalled();
    });
  });

  describe('completeOnboarding', () => {
    it('should set onboardingCompleted to true and save', async () => {
      const profile = { userId: 'u1', onboardingCompleted: false };
      mockPlayerProfileRepository.findOne.mockResolvedValue(profile);
      mockPlayerProfileRepository.save.mockResolvedValue({ ...profile, onboardingCompleted: true });

      await service.completeOnboarding('u1');

      expect(profile.onboardingCompleted).toBe(true);
      expect(mockPlayerProfileRepository.save).toHaveBeenCalledWith(profile);
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPlayerProfileRepository.findOne.mockResolvedValue(null);
      await expect(service.completeOnboarding('u1')).rejects.toThrow(NotFoundException);
    });
  });
});
