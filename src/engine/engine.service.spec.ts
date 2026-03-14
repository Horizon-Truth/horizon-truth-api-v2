import { Test, TestingModule } from '@nestjs/testing';
import { EngineService } from './engine.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { GameProgress } from './entities/game-progress.entity';
import { PlayerAction } from './entities/player-action.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { GameLevel } from './entities/game-level.entity';
import { PlayerChoice } from './entities/player-choice.entity';
import { SceneContent } from './entities/scene-content.entity';
import { GuestPlay } from './entities/guest-play.entity';
import { PlayerScenarioRecord } from './entities/player-scenario-record.entity';
import { DataSource } from 'typeorm';
import { GamificationService } from '../gamification/gamification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';

describe('EngineService', () => {
  let service: EngineService;
  let scenarioRepository: any;
  let gameProgressRepository: any;

  const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  });

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
        })),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    }),
  };

  const mockGamificationService = {
    checkBadgeEligibility: jest.fn(),
    updateLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineService,
        { provide: getRepositoryToken(Scenario), useFactory: mockRepository },
        { provide: getRepositoryToken(Scene), useFactory: mockRepository },
        { provide: getRepositoryToken(GameProgress), useFactory: mockRepository },
        { provide: getRepositoryToken(PlayerAction), useFactory: mockRepository },
        { provide: getRepositoryToken(GameOutcome), useFactory: mockRepository },
        { provide: getRepositoryToken(GameLevel), useFactory: mockRepository },
        { provide: getRepositoryToken(PlayerChoice), useFactory: mockRepository },
        { provide: getRepositoryToken(SceneContent), useFactory: mockRepository },
        { provide: getRepositoryToken(GuestPlay), useFactory: mockRepository },
        { provide: getRepositoryToken(PlayerScenarioRecord), useFactory: mockRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: GamificationService, useValue: mockGamificationService },
      ],
    }).compile();

    service = module.get<EngineService>(EngineService);
    scenarioRepository = module.get(getRepositoryToken(Scenario));
    gameProgressRepository = module.get(getRepositoryToken(GameProgress));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScenarioById', () => {
    it('should return a scenario if found', async () => {
      const scenario = { id: 's1', title: 'Test Scenario' };
      scenarioRepository.findOne.mockResolvedValue(scenario);

      const result = await service.getScenarioById('s1');

      expect(result).toEqual(scenario);
      expect(scenarioRepository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if scenario not found', async () => {
      scenarioRepository.findOne.mockResolvedValue(null);

      await expect(service.getScenarioById('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('startGame', () => {
    it('should create new progress if none exists', async () => {
      const scenario = { id: 's1', isActive: true, scenes: [{ id: 'sc1', order: 1 }] };
      scenarioRepository.findOne.mockResolvedValue(scenario);
      gameProgressRepository.findOne.mockResolvedValue(null);
      gameProgressRepository.create.mockReturnValue({ id: 'p1' });
      gameProgressRepository.save.mockResolvedValue({ id: 'p1' });

      // Mock getGameProgress internal call
      jest.spyOn(service, 'getGameProgress').mockResolvedValue({ id: 'p1' } as any);

      const result = await service.startGame('u1', 's1');

      expect(result.id).toBe('p1');
      expect(gameProgressRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if scenario is inactive', async () => {
      const scenario = { id: 's1', isActive: false };
      scenarioRepository.findOne.mockResolvedValue(scenario);

      await expect(service.startGame('u1', 's1')).rejects.toThrow(BadRequestException);
    });
  });
});
