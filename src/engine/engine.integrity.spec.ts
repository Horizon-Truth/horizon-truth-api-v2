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