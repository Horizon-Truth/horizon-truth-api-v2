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