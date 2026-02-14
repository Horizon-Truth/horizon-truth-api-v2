/**
 * Phase 8 — Integrity Testing Suite
 *
 * Covers:
 *  1. Branch path integrity (no dead-ends, valid next_scene_id)
 *  2. Trust score math (cumulative correctness)
 *  3. Badge deduplication prevention
 *  4. Scenario completion state management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EngineService } from './engine.service';
import { GamificationService } from '../gamification/gamification.service';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { GameProgress } from './entities/game-progress.entity';
import { PlayerAction } from './entities/player-action.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { PlayerChoice } from './entities/player-choice.entity';
import { SceneContent } from './entities/scene-content.entity';
import { GuestPlay } from './entities/guest-play.entity';
import { PlayerScenarioRecord } from './entities/player-scenario-record.entity';
import { GameLevel } from './entities/game-level.entity';
import { Badge } from '../gamification/entities/badge.entity';
import { UserBadge } from '../gamification/entities/user-badge.entity';
import { Leaderboard } from '../gamification/entities/leaderboard.entity';
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRepo<T>(overrides: Partial<Record<keyof T, any>> = {}) {
  const manager = {
    findOne: jest.fn(),
    save: jest.fn((entity: any, data: any) => data || entity),
    create: jest.fn((entity: any, data: any) => data || entity),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: '0', totalScore: '0' }),
    })),
  } as any;
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn((data) => ({ id: 'generated-id', ...data })),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawOne: jest.fn().mockResolvedValue({ count: '0', totalScore: '0' }),
    })),
    manager,
    ...overrides,
  };
}

function makeQueryRunner(overrides: any = {}) {
  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((entity, data) => ({ ...data })),
      create: jest.fn((entity, data) => data),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      })),
    },
    ...overrides,
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Phase 8 — Integrity Testing', () => {
  let engineService: EngineService;
  let gamificationService: GamificationService;

  let scenarioRepo: ReturnType<typeof makeRepo>;
  let sceneRepo: ReturnType<typeof makeRepo>;
  let progressRepo: ReturnType<typeof makeRepo>;
  let playerActionRepo: ReturnType<typeof makeRepo>;
  let gameOutcomeRepo: ReturnType<typeof makeRepo>;
  let gameLevelRepo: ReturnType<typeof makeRepo>;
  let playerChoiceRepo: ReturnType<typeof makeRepo>;
  let badgeRepo: ReturnType<typeof makeRepo>;
  let userBadgeRepo: ReturnType<typeof makeRepo>;
  let leaderboardRepo: ReturnType<typeof makeRepo>;
  let playerProfileRepo: ReturnType<typeof makeRepo>;
  let dataSource: { createQueryRunner: jest.Mock, getRepository: jest.Mock };

  beforeEach(async () => {
    scenarioRepo = makeRepo();
    sceneRepo = makeRepo();
    progressRepo = makeRepo();
    playerActionRepo = makeRepo();
    gameOutcomeRepo = makeRepo();
    gameLevelRepo = makeRepo();
    playerChoiceRepo = makeRepo();
    badgeRepo = makeRepo();
    userBadgeRepo = makeRepo();
    leaderboardRepo = makeRepo();
    playerProfileRepo = makeRepo();
    const sceneContentRepo = makeRepo();
    const guestPlayRepo = makeRepo();
    const playerScenarioRecordRepo = makeRepo();

    const qr = makeQueryRunner();
    badgeRepo.findOne.mockImplementation(({ where }) => ({
      id: 'badge-id',
      code: where.code,
      name: 'Test Badge',
      isActive: true,
    }));
    dataSource = { 
      createQueryRunner: jest.fn(() => qr),
      getRepository: jest.fn((entity) => {
        if (entity.name === 'PlayerProfile') return playerProfileRepo;
        return makeRepo();
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineService,
        GamificationService,
        { provide: getRepositoryToken(Scenario), useValue: scenarioRepo },
        { provide: getRepositoryToken(Scene), useValue: sceneRepo },
        { provide: getRepositoryToken(GameProgress), useValue: progressRepo },
        {
          provide: getRepositoryToken(PlayerAction),
          useValue: playerActionRepo,
        },
        { provide: getRepositoryToken(GameOutcome), useValue: gameOutcomeRepo },
        { provide: getRepositoryToken(GameLevel), useValue: gameLevelRepo },
        {
          provide: getRepositoryToken(PlayerChoice),
          useValue: playerChoiceRepo,
        },
        { provide: getRepositoryToken(Badge), useValue: badgeRepo },
        { provide: getRepositoryToken(UserBadge), useValue: userBadgeRepo },
        { provide: getRepositoryToken(Leaderboard), useValue: leaderboardRepo },
        { provide: getRepositoryToken(SceneContent), useValue: sceneContentRepo },
        { provide: getRepositoryToken(GuestPlay), useValue: guestPlayRepo },
        { provide: getRepositoryToken(PlayerScenarioRecord), useValue: playerScenarioRecordRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    engineService = module.get<EngineService>(EngineService);
    gamificationService = module.get<GamificationService>(GamificationService);
  });

  // ─── 1. Branch Path Integrity ─────────────────────────────────────────────

  describe('1. Branch Path Integrity', () => {
    it('should throw NotFoundException when scenario has no scenes', async () => {
      scenarioRepo.findOne.mockResolvedValue({
        id: 'scenario-1',
        isActive: true,
        scenes: [],
      });
      progressRepo.findOne.mockResolvedValue(null);

      await expect(
        engineService.startGame('user-1', 'scenario-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should start game on the first ordered scene', async () => {
      const scenes = [
        { id: 'scene-2', order: 2 },
        { id: 'scene-1', order: 1 },
      ];
      scenarioRepo.findOne.mockResolvedValue({
        id: 'scenario-1',
        isActive: true,
        scenes,
      });
      progressRepo.findOne
        .mockResolvedValueOnce(null) // no existing progress
        .mockResolvedValue({
          // getGameProgress + getCurrentScene calls
          id: 'progress-1',
          scenarioId: 'scenario-1',
          currentSceneId: 'scene-1',
          status: GameProgressStatus.IN_PROGRESS,
          scenario: { title: 'Test' },
          currentScene: { id: 'scene-1' },
        });
      progressRepo.save.mockResolvedValue({
        id: 'progress-1',
        currentSceneId: 'scene-1',
      });
      sceneRepo.findOne.mockResolvedValue({
        id: 'scene-1',
        title: 'First',
        order: 1,
        choices: [],
        content: null,
        availableChoices: [],
      });

      const result = await engineService.startGame('user-1', 'scenario-1');
      expect(progressRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentSceneId: 'scene-1' }),
      );
    });

    it('should advance to nextSceneId from choice when set', async () => {
      const scene1 = { id: 'scene-1', order: 1 };
      const scene2 = { id: 'scene-2', order: 2 };
      const choice = {
        id: 'choice-1',
        label: 'VERIFY',
        nextSceneId: 'scene-2',
        outcomes: [],
      };
      const progress = {
        id: 'progress-1',
        userId: 'user-1',
        scenarioId: 'scenario-1',
        currentSceneId: 'scene-1',
        status: GameProgressStatus.IN_PROGRESS,
        scenario: { scenes: [scene1, scene2] },
      };

      const qr = makeQueryRunner();
      qr.manager.createQueryBuilder.mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(progress),
      });
      qr.manager.find.mockResolvedValue([]); 
      qr.manager.findOne
        .mockResolvedValueOnce(null) // 2. Action (replay check)
        .mockResolvedValueOnce(choice) // 3. Choice
        .mockResolvedValueOnce(null); // 4. Outcome template
      dataSource.createQueryRunner.mockReturnValue(qr);

      sceneRepo.findOne.mockResolvedValue({
        id: 'scene-2',
        title: 'Scene 2',
        order: 2,
        choices: [],
        content: null,
        availableChoices: [],
      });
      progressRepo.findOne // used in getCurrentScene/getGameProgress after commit
        .mockResolvedValue({
          id: 'progress-1',
          scenarioId: 'scenario-1',
          status: GameProgressStatus.IN_PROGRESS,
          currentSceneId: 'scene-2',
          scenario: { title: 'Test' },
          currentScene: { id: 'scene-2' },
        });

      const result = await engineService.submitChoice('user-1', {
        progressId: 'progress-1',
        sceneId: 'scene-1',
        choiceId: 'choice-1',
      });

      expect(qr.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentSceneId: 'scene-2' }),
      );
    });

    it('should fall back to sequential scene if no nextSceneId on choice', async () => {
      const scene1 = { id: 'scene-1', order: 1 };
      const scene2 = { id: 'scene-2', order: 2 };
      const choice = {
        id: 'choice-1',
        label: 'VERIFY',
        nextSceneId: null,
        outcomes: [],
      };
      const progress = {
        id: 'progress-1',
        userId: 'user-1',
        scenarioId: 'scenario-1',
        currentSceneId: 'scene-1',
        status: GameProgressStatus.IN_PROGRESS,
        scenario: { scenes: [scene1, scene2] },
      };

      const qr = makeQueryRunner();
      qr.manager.createQueryBuilder.mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(progress),
      });
      qr.manager.find.mockResolvedValue([]); 
      qr.manager.findOne
        .mockResolvedValueOnce(null) // 2. Action (replay check)
        .mockResolvedValueOnce(choice) // 3. Choice
        .mockResolvedValueOnce(null); // 4. Outcome template
      dataSource.createQueryRunner.mockReturnValue(qr);

      progressRepo.findOne // used in getCurrentScene/getGameProgress after commit
        .mockResolvedValue({
          id: 'progress-1',
          scenarioId: 'scenario-1',
          status: GameProgressStatus.IN_PROGRESS,
          currentSceneId: 'scene-2',
          scenario: { title: 'Test' },
          currentScene: { id: 'scene-2' },
        });
      sceneRepo.findOne.mockResolvedValue({
        id: 'scene-2',
        title: 'Scene 2',
        order: 2,
        choices: [],
        content: null,
        availableChoices: [],
      });

      await engineService.submitChoice('user-1', {
        progressId: 'progress-1',
        sceneId: 'scene-1',
        choiceId: 'choice-1',
      });

      // Should advance to scene-2 sequentially
      expect(qr.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentSceneId: 'scene-2' }),
      );
    });

    it('should complete game when no next scene exists (terminal)', async () => {
      const scene1 = { id: 'scene-1', order: 1 };
      const choice = {
        id: 'choice-1',
        label: 'IGNORE',
        nextSceneId: null,
        outcomes: [],
      };
      const progress = {
        id: 'progress-1',
        userId: 'user-1',
        scenarioId: 'scenario-1',
        currentSceneId: 'scene-1',
        status: GameProgressStatus.IN_PROGRESS,
        scenario: { scenes: [scene1], title: 'Test' },
        user: {},
      };

      const qr = makeQueryRunner();
      qr.manager.createQueryBuilder.mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(progress),
      });
      qr.manager.findOne
        .mockResolvedValueOnce(null) // 1. Action
        .mockResolvedValueOnce(choice) // 2. Choice
        .mockResolvedValueOnce(null); // 3. Outcome
      qr.manager.find.mockResolvedValueOnce([]); // sceneChoices for accuracy
      dataSource.createQueryRunner.mockReturnValue(qr);

      // completeGame dependencies