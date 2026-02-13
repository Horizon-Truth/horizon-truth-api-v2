import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In } from 'typeorm';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { GameLevel } from './entities/game-level.entity';
import { GameProgress } from './entities/game-progress.entity';
import { PlayerAction } from './entities/player-action.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { PlayerChoice } from './entities/player-choice.entity';
import { SceneContent } from './entities/scene-content.entity';
import { ScenarioQueryDto } from './dto/scenario-query.dto';
import { SubmitChoiceDto } from './dto/submit-choice.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { SceneContentType } from '../shared/enums/scene-content-type.enum';
import { GamificationService } from '../gamification/gamification.service';
import { PlayerProfile } from '../players/entities/player-profile.entity';

import { PlayerScenarioRecord } from './entities/player-scenario-record.entity';
import { GuestPlay } from './entities/guest-play.entity';
import { SaveGuestPlayDto } from './dto/save-guest-play.dto';
import {
  ContentLanguage,
  normalizeLanguage,
} from '../shared/enums/content-language.enum';

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    @InjectRepository(Scenario)
    private scenarioRepository: Repository<Scenario>,
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
    @InjectRepository(GameProgress)
    private gameProgressRepository: Repository<GameProgress>,
    @InjectRepository(PlayerAction)
    private playerActionRepository: Repository<PlayerAction>,
    @InjectRepository(GameOutcome)
    private gameOutcomeRepository: Repository<GameOutcome>,
    @InjectRepository(GameLevel)
    private gameLevelRepository: Repository<GameLevel>,
    @InjectRepository(PlayerChoice)
    private playerChoiceRepository: Repository<PlayerChoice>,
    @InjectRepository(SceneContent)
    private sceneContentRepository: Repository<SceneContent>,
    @InjectRepository(GuestPlay)
    private guestPlayRepository: Repository<GuestPlay>,
    @InjectRepository(PlayerScenarioRecord)
    private playerScenarioRecordRepository: Repository<PlayerScenarioRecord>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => GamificationService))
    private gamificationService: GamificationService,
  ) { }

  /**
   * Save anonymous guest play data
   */
  async saveGuestPlay(dto: SaveGuestPlayDto): Promise<GuestPlay> {
    const guestPlay = this.guestPlayRepository.create({
      ...dto,
      completedAt: new Date(),
    });
    return this.guestPlayRepository.save(guestPlay);
  }

  /**
   * Get all guest plays (for admin)
   */
  async getGuestPlays(): Promise<GuestPlay[]> {
    return this.guestPlayRepository.find({
      relations: ['scenario'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get list of scenarios with optional filtering and user records
   */
  async getScenarios(query: ScenarioQueryDto, userId?: string): Promise<any> {
    const { difficulty, scenarioType, isActive, isArchived, language, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Fetch all matching scenarios (ignoring pagination at DB level to allow sorting by computed lockStatus)
    const queryBuilder = this.scenarioRepository
      .createQueryBuilder('scenario')
      .leftJoinAndSelect('scenario.gameLevel', 'gameLevel')
      .orderBy('scenario.order', 'ASC');

    // Language filtering. Player-facing requests always carry a resolved
    // language (the controller injects the player's selected language) so
    // content is never mixed across languages. Admin requests may omit it to
    // browse every language.
    if (language) {
      queryBuilder.andWhere('scenario.language = :language', { language });
    }

    if (search) {
      queryBuilder.andWhere(
        '(scenario.title ILIKE :search OR scenario.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (difficulty) {
      queryBuilder.andWhere('scenario.difficulty = :difficulty', { difficulty });
    }

    if (scenarioType) {
      queryBuilder.andWhere('scenario.scenarioType = :scenarioType', { scenarioType });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('scenario.isActive = :isActive', { isActive });
    }

    if (isArchived !== undefined) {
      if (isArchived === false) {
        // Support existing data where isArchived might be NULL
        queryBuilder.andWhere('(scenario.isArchived = :isArchived OR scenario.isArchived IS NULL)', { isArchived });
      } else {
        queryBuilder.andWhere('scenario.isArchived = :isArchived', { isArchived });
      }
    }

    const scenarios = await queryBuilder.getMany();

    // Diagnostics: verify language filtering is actually constraining results.
    this.logger.debug(
      `getScenarios language=${language ?? 'ALL'} search=${search ?? '-'} -> ${scenarios.length} scenario(s)` +
        (language && scenarios.some((s) => s.language !== language)
          ? ' [WARNING: language leak detected]'
          : ''),
    );

    // If userId provided, fetch ALL user records AND active progress
    let userRecords: PlayerScenarioRecord[] = [];
    let activeProgress: GameProgress[] = [];
    if (userId) {
      [userRecords, activeProgress] = await Promise.all([
        this.playerScenarioRecordRepository.find({
          where: { userId },
        }),
        this.gameProgressRepository.find({
          where: { userId, status: GameProgressStatus.IN_PROGRESS },
          select: ['id', 'scenarioId']
        })
      ]);
    }

    // Build a map for prerequisite lookups
    const allScenarios = await this.scenarioRepository.find({ select: ['id', 'minimumScore', 'unlockScenarioId'] });
    const scenarioMap = new Map(allScenarios.map(s => [s.id, s]));

    // Map records and compute lockStatus
    const scenariosWithRecords = scenarios.map((scenario) => {
      const userRecord = userRecords.find((r) => r.scenarioId === scenario.id) || null;
      const progress = activeProgress.find((p) => p.scenarioId === scenario.id);

      let lockStatus: 'LOCKED' | 'AVAILABLE' | 'VERIFIED' = 'AVAILABLE';
      
      // Only compute lock status if a userId is provided (intended for players)
      if (userId) {
        if (userRecord?.isCompleted) {
          lockStatus = 'VERIFIED';
        } else if (scenario.unlockScenarioId) {
          const prereqRecord = userRecords.find((r) => r.scenarioId === scenario.unlockScenarioId);
          const prereqScenario = scenarioMap.get(scenario.unlockScenarioId);
          const requiredScore = prereqScenario?.minimumScore ?? 70;

          if (!prereqRecord || !prereqRecord.isCompleted || (prereqRecord.bestAccuracyRate ?? 0) < requiredScore) {
            lockStatus = 'LOCKED';
          }
        }
      }

      return {
        ...scenario,
        userRecord,
        lockStatus,
        activeProgressId: progress?.id || null,
      };
    });

    // Custom sorting: Unlocked (AVAILABLE/VERIFIED) first, then LOCKED
    // Within the same status, sort by scenario.order
    scenariosWithRecords.sort((a, b) => {
      // If no lock status provided (Admin view), just sort by order
      if (!userId) {
        return (a.order || 0) - (b.order || 0);
      }
      
      const statusScore = { 'VERIFIED': 0, 'AVAILABLE': 0, 'LOCKED': 1 };
      const statusDiff = statusScore[a.lockStatus] - statusScore[b.lockStatus];
      if (statusDiff !== 0) return statusDiff;
      return (a.order || 0) - (b.order || 0);
    });

    // Manual pagination
    const paginatedScenarios = scenariosWithRecords.slice(skip, skip + limit);

    return {
      data: paginatedScenarios,
      total: scenariosWithRecords.length,
      page,
      limit,
    };
  }

  /**
   * Get scenario by ID with all scenes
   */
  async getScenarioById(id: string): Promise<Scenario> {
    const scenario = await this.scenarioRepository.findOne({
      where: { id },
      relations: [
        'gameLevel',
        'scenes',
        'scenes.content',
        'scenes.choices',
        'scenes.choices.outcomes',
      ],
      order: {
        scenes: {
          order: 'ASC'
        }
      }
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with ID ${id} not found`);
    }

    return scenario;
  }

  /**
   * Get all game levels
   */
  async getLevels(): Promise<GameLevel[]> {
    return this.gameLevelRepository.find({
      order: { levelNumber: 'ASC' },
    });
  }

  async createLevel(dto: CreateLevelDto): Promise<GameLevel> {
    const level = this.gameLevelRepository.create(dto);
    return this.gameLevelRepository.save(level);
  }

  async updateLevel(id: string, dto: UpdateLevelDto): Promise<GameLevel | null> {
    await this.gameLevelRepository.update(id, dto);
    return this.gameLevelRepository.findOne({ where: { id } });
  }

  async deleteLevel(id: string): Promise<void> {
    // Check if there are any scenarios associated with this level
    const scenarioCount = await this.scenarioRepository.count({
      where: { gameLevelId: id },
    });

    if (scenarioCount > 0) {
      throw new Error('Cannot delete a level that has associated scenarios.');
    }

    await this.gameLevelRepository.delete(id);
  }

  async exportScenarios(ids: string[]): Promise<Scenario[]> {
    return this.scenarioRepository.find({
      where: { id: In(ids) },
      relations: [
        'gameLevel',
        'scenes',
        'scenes.content',
        'scenes.choices',
        'scenes.choices.outcomes',
      ],
    });
  }

  /**
   * Import scenarios from JSON data
   */
  async importScenarios(data: any[]): Promise<{ imported: number; skipped: number; total: number }> {
    let imported = 0;
    let skipped = 0;

    // Get all levels to map them by levelNumber (since IDs vary between environments)
    const levels = await this.gameLevelRepository.find();
    const levelMap = new Map(levels.map(l => [l.levelNumber, l.id]));
