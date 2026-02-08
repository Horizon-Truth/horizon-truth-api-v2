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