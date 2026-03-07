import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
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
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { GamificationService } from '../gamification/gamification.service';
import { PlayerProfile } from '../players/entities/player-profile.entity';

import { PlayerScenarioRecord } from './entities/player-scenario-record.entity';
import { GuestPlay } from './entities/guest-play.entity';
import { SaveGuestPlayDto } from './dto/save-guest-play.dto';

@Injectable()
export class EngineService {
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
    const { difficulty, scenarioType, isActive, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.scenarioRepository
      .createQueryBuilder('scenario')
      .leftJoinAndSelect('scenario.gameLevel', 'gameLevel')
      .skip(skip)
      .take(limit);

    if (difficulty) {
      queryBuilder.andWhere('scenario.difficulty = :difficulty', {
        difficulty,
      });
    }

    if (scenarioType) {
      queryBuilder.andWhere('scenario.scenarioType = :scenarioType', {
        scenarioType,
      });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('scenario.isActive = :isActive', { isActive });
    }

    const [scenarios, total] = await queryBuilder.getManyAndCount();

    // If userId provided, fetch ALL user records (not just current page scenarios)
    // so prerequisite lookups always work across scenario pages
    let userRecords: PlayerScenarioRecord[] = [];
    if (userId) {
      userRecords = await this.playerScenarioRecordRepository.find({
        where: { userId },
      });
    }

    // Build a map of all scenarios by id for prerequisite minimumScore lookup
    const allScenarios = await this.scenarioRepository.find({ select: ['id', 'minimumScore', 'unlockScenarioId'] });
    const scenarioMap = new Map(allScenarios.map(s => [s.id, s]));

    // Map records to scenarios
    const scenariosWithRecords = scenarios.map((scenario) => {
      const userRecord = userRecords.find((r) => r.scenarioId === scenario.id) || null;

      // Compute lock_status
      let lockStatus: 'LOCKED' | 'AVAILABLE' | 'VERIFIED' = 'AVAILABLE';
      if (userRecord?.isCompleted) {
        lockStatus = 'VERIFIED';
      } else if (scenario.unlockScenarioId) {
        // Prerequisite exists — check if the player completed it with sufficient accuracy rate (%)
        const prereqRecord = userRecords.find((r) => r.scenarioId === scenario.unlockScenarioId);
        const prereqScenario = scenarioMap.get(scenario.unlockScenarioId);
        const requiredScore = prereqScenario?.minimumScore ?? 70;

        // Use bestAccuracyRate for comparison with percentage-based minimumScore
        if (!prereqRecord || !prereqRecord.isCompleted || (prereqRecord.bestAccuracyRate ?? 0) < requiredScore) {
          lockStatus = 'LOCKED';
        }
      }
      // If unlockScenarioId is null/undefined → stays 'AVAILABLE' (no prerequisite)

      return {
        ...scenario,
        userRecord,
        lockStatus,
      };
    });

    return {
      data: scenariosWithRecords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with ID ${id} not found`);
    }

    return scenario;
  }

  /**
   * Start a new game session for a user
   */
  async startGame(userId: string, scenarioId: string): Promise<any> {
    // Check if scenario exists and is active
    const scenario = await this.scenarioRepository.findOne({
      where: { id: scenarioId },
      relations: ['scenes'],
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with ID ${scenarioId} not found`);
    }

    if (!scenario.isActive) {
      throw new BadRequestException('This scenario is not currently available');
    }

    // Check if user already has an in-progress game for this scenario
    const existingProgress = await this.gameProgressRepository.findOne({
      where: {
        userId,
        scenarioId,
        status: GameProgressStatus.IN_PROGRESS,
      },
    });

    if (existingProgress) {
      // Return existing progress instead of creating new one
      return this.getGameProgress(existingProgress.id);
    }

    // Get the first scene (assuming scenes are ordered)
    const firstScene = scenario.scenes.sort((a, b) => a.order - b.order)[0];

    if (!firstScene) {
      throw new BadRequestException('Scenario has no scenes configured');
    }

    // Create new game progress
    const gameProgress = this.gameProgressRepository.create({
      userId,
      scenarioId,
      currentSceneId: firstScene.id,
      status: GameProgressStatus.IN_PROGRESS,
    });

    const savedProgress = await this.gameProgressRepository.save(gameProgress);

    // Return progress with current scene
    return this.getGameProgress(savedProgress.id);
  }

  /**
   * Get game progress details with current scene
   */
  async getGameProgress(progressId: string): Promise<any> {
    const progress = await this.gameProgressRepository.findOne({
      where: { id: progressId },
      relations: ['scenario', 'currentScene', 'user'],
    });

    if (!progress) {
      throw new NotFoundException(
        `Game progress with ID ${progressId} not found`,
      );
    }

    // Get current scene with all content
    const currentScene = await this.getCurrentScene(progressId);

    return {
      id: progress.id,
      scenarioId: progress.scenarioId,
      scenarioTitle: progress.scenario.title,
      status: progress.status,
      currentScene,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      finalOutcome: progress.finalOutcome,
    };
  }

  /**
   * Get current scene with all content (chat, feed items, content)
   */
  async getCurrentScene(progressId: string): Promise<any> {
    const progress = await this.gameProgressRepository.findOne({
      where: { id: progressId },
    });

    if (!progress) {
      throw new NotFoundException(`Game progress not found`);
    }

    if (!progress.currentSceneId) {
      throw new BadRequestException('No current scene available');
    }

    const scene = await this.sceneRepository.findOne({
      where: { id: progress.currentSceneId },
      relations: [
        'content',
        'content.chatMessages',
        'content.feedItems',
        'choices',
      ],
    });

    if (!scene) {
      throw new NotFoundException('Current scene not found');
    }

    return {
      id: scene.id,
      title: scene.title,
      description: scene.description,
      order: scene.order,
      sceneType: scene.sceneType,
      sceneTypeLabel: scene.sceneTypeLabel,
      contentType: scene.contentType,
      decisionTimeLimit: scene.decisionTimeLimit || null,
      content: scene.content || null,
      chatMessages: scene.content?.chatMessages || [],
      feedItems: scene.content?.feedItems || [],
      choices:
        scene.choices?.map((c) => ({
          id: c.id,
          label: c.label,
          actionType: c.actionType,
          spreadSimulation: c.spreadSimulation || null,
          psychologicalTrap: c.psychologicalTrap || null,
        })) || [],
      availableChoices: scene.availableChoices || ['CHOICE', 'NEXT', 'FINISH'],
    };
  }

  /**
   * Submit a player choice and advance the game
   */
  async submitChoice(
    userId: string,
    submitChoiceDto: SubmitChoiceDto,
  ): Promise<any> {
    const { progressId, sceneId, choiceId, choiceKey, metadata } =
      submitChoiceDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch progress with PESSIMISTIC_WRITE lock and verify ownership
      const progress = await queryRunner.manager
        .createQueryBuilder(GameProgress, 'progress')
        .setLock('pessimistic_write')
        .where('progress.id = :id AND progress.userId = :userId', {
          id: progressId,
          userId,
        })
        .getOne();

      if (progress) {
        // Fetch relations separately to avoid FOR UPDATE on outer join error
        const scenario = await queryRunner.manager.findOne(Scenario, {
          where: { id: progress.scenarioId },
          relations: ['scenes'],
        });

        if (!scenario) {
          throw new NotFoundException('Scenario not found for this game');
        }
        progress.scenario = scenario;
      }

      if (!progress) {
        throw new NotFoundException('Game progress not found or unauthorized');
      }

      // 2. Status Immutability: Prevent modifications to completed games
      if (progress.status !== GameProgressStatus.IN_PROGRESS) {
        throw new BadRequestException(
          `Cannot submit choice: Game is ${progress.status}`,
        );
      }

      if (progress.currentSceneId !== sceneId) {
        throw new BadRequestException('Invalid scene for current progress');
      }

      // 3. Replay Exploit Prevention: Check if choice already submitted for this scene
      const existingAction = await queryRunner.manager.findOne(PlayerAction, {
        where: { userId, progressId, sceneId },
      });

      if (existingAction) {
        throw new BadRequestException(
          'Choice already submitted for this scene',
        );
      }

      // 4. Find the choice
      let choice: PlayerChoice | null = null;
      if (choiceId) {
        choice = await queryRunner.manager.findOne(PlayerChoice, {
          where: { id: choiceId, sceneId },
          relations: ['outcomes'],
        });
      } else if (choiceKey) {
        choice = await queryRunner.manager.findOne(PlayerChoice, {
          where: { sceneId, label: choiceKey },
          relations: ['outcomes'],
        });
      }

      if (!choice && choiceId) {
        throw new NotFoundException(
          `Choice with ID ${choiceId} not found in this scene`,
        );
      }

      // 5. Record the player's action (Immutable Record)
      const playerAction = queryRunner.manager.create(PlayerAction, {
        userId,
        scenarioId: progress.scenarioId,
        progressId: progress.id, // Ensure link to progress
        sceneId,
        choiceKey: choice?.label || choiceKey || 'UNKNOWN',
        metadata,
      });
      await queryRunner.manager.save(playerAction);

      // 6. Handle Outcomes
      let templateOutcome = choice?.outcomes?.find((o) => !o.userId);
      if (!templateOutcome && choice) {
        templateOutcome = (await queryRunner.manager.findOne(GameOutcome, {
          where: { playerChoiceId: choice.id, userId: IsNull() },
        })) as GameOutcome;
      }

      const result: any = { status: 'scene_completed' };

      // 6. Aggregate score and influence to progress (Always do this if choice exists)
      if (choice) {
        progress.totalScore = (progress.totalScore || 0) + (choice.scoreImpact || 0);
        progress.influenceScore = (progress.influenceScore || 0) + (choice.influenceImpact || 0);

        // Track accuracy metrics
        progress.totalDecisions = (progress.totalDecisions || 0) + 1;
        if ((choice.scoreImpact || 0) > 0) {
          progress.correctDecisions = (progress.correctDecisions || 0) + 1;
        }

        // Calculate real-time percentage based on score vs total possible
        const maxScore = progress.scenario.totalPossibleScore || 100;
        progress.accuracyRate = Math.max(0, Math.round(((progress.totalScore || 0) / maxScore) * 100));

        // 7. Update persistent trust score (Sync with choice quality)
        const playerProfile = await queryRunner.manager.findOne(
          PlayerProfile,
          { where: { userId } },
        );

        if (playerProfile) {
          // Use trustScoreDelta if available, otherwise fallback to scoreImpact
          const trustDelta = templateOutcome?.trustScoreDelta !== undefined
            ? templateOutcome.trustScoreDelta
            : (choice.scoreImpact || 0);

          playerProfile.currentTrustScore = (playerProfile.currentTrustScore || 50) + trustDelta;
          await queryRunner.manager.save(PlayerProfile, playerProfile);

          // Update result for frontend feedback
          result.trustScoreDelta = trustDelta;
        }
      }

      if (templateOutcome) {
        // Process message templates
        let processedMessage = templateOutcome.message || '';
        if (
          processedMessage.includes('{{reach}}') ||
          processedMessage.includes('{{percent}}')
        ) {
          const reach = Math.floor(Math.random() * 900) + 100;
          const percent = Math.floor(Math.random() * 41) + 50;
          processedMessage = processedMessage
            .replace('{{reach}}', reach.toString())
            .replace('{{percent}}', percent.toString());
        }

        // Create user-specific outcome
        const userOutcome = queryRunner.manager.create(GameOutcome, {
          ...templateOutcome,
          id: undefined,
          userId,
          progressId,
          message: processedMessage,
          completedAt: new Date(),
        });
        await queryRunner.manager.save(userOutcome);

        result.message = processedMessage;

        // Check badges
        try {
          const awardedMidGame =
            await this.gamificationService.checkOutcomeBadgeEligibility(
              userId,
              userOutcome,
            );
          if (awardedMidGame.length > 0) result.awardedBadges = awardedMidGame;
        } catch (bErr) {
          console.error('Badge error:', bErr.message);
        }
      }

      // 8. Handle scenario termination or advance to next scene
      const nextSceneId = choice?.nextSceneId;
      const endScenarioRequested = templateOutcome?.endScenario;

      if (endScenarioRequested) {
        await queryRunner.manager.save(progress);
        await queryRunner.commitTransaction();
        return this.completeGame(progressId, templateOutcome?.outcomeType || OutcomeType.SUCCESS);
      }

      if (nextSceneId) {
        progress.currentSceneId = nextSceneId;
        await queryRunner.manager.save(progress);
      } else {
        const allScenes = progress.scenario.scenes.sort(
          (a, b) => a.order - b.order,
        );
        const currentIndex = allScenes.findIndex((s) => s.id === sceneId);
        const sequentialNext = allScenes[currentIndex + 1];

        if (sequentialNext) {
          progress.currentSceneId = sequentialNext.id;
          await queryRunner.manager.save(progress);
        } else {
          await queryRunner.manager.save(progress);
          await queryRunner.commitTransaction();
          return this.completeGame(progressId, OutcomeType.SUCCESS);
        }
      }

      await queryRunner.commitTransaction();

      // Refresh progress and return next scene
      result.nextScene = await this.getCurrentScene(progressId);
      result.progress = await this.getGameProgress(progressId);
      result.totalScore = result.progress.totalScore;
      result.influenceScore = result.progress.influenceScore;
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Complete the game and record outcome
   */
  async completeGame(
    progressId: string,
    outcomeType: OutcomeType,
  ): Promise<any> {
    const progress = await this.gameProgressRepository.findOne({
      where: { id: progressId },
      relations: ['scenario', 'user'],
    });

    if (!progress) {
      throw new NotFoundException('Game progress not found');
    }

    if (progress.status === GameProgressStatus.COMPLETED) {
      throw new BadRequestException('Game is already completed');
    }

    // Mark as completed
    progress.status = GameProgressStatus.COMPLETED;
    progress.completedAt = new Date();
    progress.finalOutcome = outcomeType;

    // Evaluate if passed based on scenario settings (using percentage)
    const minRequired = progress.scenario.minimumScore || 70;
    progress.passed = (progress.accuracyRate || 0) >= minRequired;

    // Compute narrative ending based on score + influence
    const totalScore = progress.totalScore || 0;
    const influenceScore = progress.influenceScore || 0;
    let narrativeEnding = 'COMMUNITY_CRISIS';
    if (totalScore >= 85 && influenceScore >= 70) {
      narrativeEnding = 'TRUTH_VICTORY';
    } else if (progress.passed) {
      narrativeEnding = 'CONTAINED_EARLY';
    } else if (influenceScore < 30) {
      narrativeEnding = 'VIRAL_MISINFORMATION';
    }
    progress.narrativeEnding = narrativeEnding;

    await this.gameProgressRepository.save(progress);

    // Calculate score based on outcome type
    const scoreMap: Record<string, number> = {
      [OutcomeType.PERFECT_PASS]: 150,
      [OutcomeType.PASS]: 100,
      [OutcomeType.SUCCESS]: 100,
      [OutcomeType.NEUTRAL]: 60,
      [OutcomeType.PARTIAL_FAIL]: 40,
      [OutcomeType.FAIL]: 20,
      [OutcomeType.FAILURE]: 20,
      [OutcomeType.DEATH]: 0,
    };
    const score = scoreMap[outcomeType] ?? 50;

    // Create game outcome
    const outcome = this.gameOutcomeRepository.create({
      userId: progress.userId,
      scenarioId: progress.scenarioId,
      progressId: progress.id,
      outcomeType,
      score,
      completedAt: progress.completedAt,
      feedback: this.generateFeedback(outcomeType, score),
    });

    await this.gameOutcomeRepository.save(outcome);

    // Update or create player scenario record
    try {
      let record = await this.playerScenarioRecordRepository.findOne({
        where: { userId: progress.userId, scenarioId: progress.scenarioId },
      });

      if (!record) {
        record = this.playerScenarioRecordRepository.create({
          userId: progress.userId,
          scenarioId: progress.scenarioId,
          bestScore: progress.totalScore || 0,
          bestAccuracyRate: progress.accuracyRate || 0,
          bestInfluence: progress.influenceScore || 0,
          isCompleted: progress.passed || false,
          attempts: 1,
        });
      } else {
        record.attempts += 1;
        if ((progress.totalScore || 0) > record.bestScore) {
          record.bestScore = progress.totalScore;
        }
        const currentAccuracy = progress.accuracyRate || 0;
        if (currentAccuracy > record.bestAccuracyRate) {
          record.bestAccuracyRate = currentAccuracy;
        }
        if ((progress.influenceScore || 0) > record.bestInfluence) {
          record.bestInfluence = progress.influenceScore;
        }
        if (progress.passed) {
          record.isCompleted = true;
        }
      }
      await this.playerScenarioRecordRepository.save(record);
    } catch (recordErr) {
      console.error('Failed to update player scenario record:', recordErr);
    }

    // Note: Trust score was already updated in submitChoice() when the
    // player made their final decision. No need to update again here.

    // Update player reputation role and streak
    try {
      const playerProfile = await this.dataSource.getRepository(PlayerProfile).findOne({
        where: { userId: progress.userId },
      });

      if (playerProfile) {
        // Update reputation role based on influence score
        const totalInfluence = playerProfile.currentTrustScore || 0;
        if (influenceScore >= 80 || totalInfluence >= 200) {
          playerProfile.reputationRole = 'TRUSTED_VERIFIER';
        } else if (influenceScore >= 50 || totalInfluence >= 100) {
          playerProfile.reputationRole = 'FACT_CHECKER';
        } else if (influenceScore >= 80 && progress.passed) {
          playerProfile.reputationRole = 'MODERATOR';
        }

        // Update streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        const lastPlayed = playerProfile.lastPlayedDate
          ? new Date(playerProfile.lastPlayedDate).toISOString().split('T')[0]
          : null;

        if (lastPlayed === null) {
          // First ever play
          playerProfile.currentStreak = 1;
        } else {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastPlayed === todayStr) {
            // Already played today — streak unchanged
          } else if (lastPlayed === yesterdayStr) {
            // Played yesterday — increment streak
            playerProfile.currentStreak = (playerProfile.currentStreak || 0) + 1;
          } else {
            // Missed a day — reset streak
            playerProfile.currentStreak = 1;
          }
        }

        if (playerProfile.currentStreak > (playerProfile.longestStreak || 0)) {
          playerProfile.longestStreak = playerProfile.currentStreak;
        }
        playerProfile.lastPlayedDate = today;

        await this.dataSource.getRepository(PlayerProfile).save(playerProfile);
      }
    } catch (profileErr) {
      console.error('Failed to update player profile after game:', profileErr);
    }

    // Trigger badge awards and leaderboard updates
    try {
      const badgesAwarded =
        await this.gamificationService.checkBadgeEligibility(progress.userId);
      await this.gamificationService.updateLeaderboard(progress.userId);

      return {
        status: 'game_completed',
        outcome: {
          outcomeType,
          score,
          feedback: outcome.feedback,
          progressId: progress.id,
          completedAt: outcome.completedAt,
          narrativeEnding,
          accuracyRate: progress.totalDecisions > 0
            ? Math.round((progress.correctDecisions / progress.totalDecisions) * 100)
            : null,
          scenario: {
            id: progress.scenarioId,
            title: progress.scenario.title,
          },
        },
        badgesAwarded,
        progress,
        totalScore: progress.totalScore,
        influenceScore: progress.influenceScore,
      };
    } catch (error) {
      // If gamification fails, still return success
      return {
        status: 'game_completed',
        outcome: {
          outcomeType,
          score,
          feedback: outcome.feedback,
          progressId: progress.id,
          completedAt: outcome.completedAt,
          narrativeEnding,
          accuracyRate: progress.totalDecisions > 0
            ? Math.round((progress.correctDecisions / progress.totalDecisions) * 100)
            : null,
          scenario: {
            id: progress.scenarioId,
            title: progress.scenario.title,
          },
        },
        progress,
        totalScore: progress.totalScore,
        influenceScore: progress.influenceScore,
      };
    }
  }

  /**
   * Get game outcome for a completed game
   */
  async getGameOutcome(progressId: string): Promise<any> {
    const outcome = await this.gameOutcomeRepository.findOne({
      where: { progressId },
    });

    if (!outcome) {
      throw new NotFoundException('Game outcome not found');
    }

    // Load scenario separately
    const scenario = await this.scenarioRepository.findOne({
      where: { id: outcome.scenarioId },
    });

    return {
      outcomeType: outcome.outcomeType,
      score: outcome.score,
      feedback: outcome.feedback,
      completedAt: outcome.completedAt,
      scenario: scenario
        ? {
          id: scenario.id,
          title: scenario.title,
        }
        : null,
    };
  }

  /**
   * Get user's game progress history
   */
  async getUserProgress(
    userId: string,
    scenarioId?: string,
  ): Promise<GameProgress[]> {
    const query: any = { userId };
    if (scenarioId) {
      query.scenarioId = scenarioId;
    }

    return this.gameProgressRepository.find({
      where: query,
      relations: ['scenario', 'currentScene'],
      order: { startedAt: 'DESC' },
    });
  }

  // Admin Methods

  async getScenes(scenarioId: string): Promise<Scene[]> {
    return this.sceneRepository.find({
      where: { scenarioId },
      order: { order: 'ASC' },
      relations: ['content', 'choices', 'choices.outcomes'],
    });
  }

  async createScene(scenarioId: string, createDto: any): Promise<Scene> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create main scene
      const scene = this.sceneRepository.create({
        scenarioId,
        title: createDto.title,
        description: createDto.description,
        order: createDto.order,
        sceneType: createDto.sceneType,
        contentType: createDto.contentType,
        isTerminal: createDto.isTerminal || false,
        availableChoices: createDto.choices ? createDto.choices.map((c: any) => c.label) : ['CHOICE', 'NEXT', 'FINISH'],
      });
      const savedScene = await queryRunner.manager.save(scene);

      // Create content
      if (createDto.content) {
        const content = this.sceneContentRepository.create({
          sceneId: savedScene.id,
          contentType: createDto.content.contentType || createDto.contentType,
          textBody: createDto.content.textBody,
          imageUrl: createDto.content.imageUrl,
          videoUrl: createDto.content.videoUrl,
        });
        await queryRunner.manager.save(content);
      }

      // Create choices and outcomes (consequences)
      if (createDto.choices && createDto.choices.length > 0) {
        for (const choiceDto of createDto.choices) {
          const choice = this.playerChoiceRepository.create({
            sceneId: savedScene.id,
            label: choiceDto.label,
            actionType: choiceDto.actionType || 'CHOICE',
            nextSceneId: choiceDto.nextSceneId,
            scoreImpact: choiceDto.scoreImpact || 0,
            influenceImpact: choiceDto.influenceImpact || 0,
          });
          const savedChoice = await queryRunner.manager.save(choice);

          if (choiceDto.outcomes && choiceDto.outcomes.length > 0) {
            for (const outcomeDto of choiceDto.outcomes) {
              const outcome = this.gameOutcomeRepository.create({
                scenarioId,
                playerChoiceId: savedChoice.id,
                outcomeType: outcomeDto.outcomeType,
                score: outcomeDto.score || 0,
                trustScoreDelta: outcomeDto.trustScoreDelta || 0,
                message: outcomeDto.message,
                endScenario: outcomeDto.endScenario || false,
              });
              await queryRunner.manager.save(outcome);
            }
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.sceneRepository.findOne({
        where: { id: savedScene.id },
        relations: ['content', 'choices', 'choices.outcomes'],
      }) as unknown as Scene;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateScene(id: string, updateDto: any): Promise<Scene> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const scene = await queryRunner.manager.findOne(Scene, { where: { id }, relations: ['content'] });
      if (!scene) throw new NotFoundException('Scene not found');

      // Update basic fields
      if (updateDto.title !== undefined) scene.title = updateDto.title;
      if (updateDto.description !== undefined) scene.description = updateDto.description;
      if (updateDto.order !== undefined) scene.order = updateDto.order;
      if (updateDto.sceneType !== undefined) scene.sceneType = updateDto.sceneType;
      if (updateDto.contentType !== undefined) scene.contentType = updateDto.contentType;
      if (updateDto.isTerminal !== undefined) scene.isTerminal = updateDto.isTerminal;
      if (updateDto.choices) {
        scene.availableChoices = updateDto.choices.map((c: any) => c.label);
      }

      await queryRunner.manager.save(scene);

      // Update content
      if (updateDto.content) {
        let content = scene.content;
        if (!content) {
          content = this.sceneContentRepository.create({ sceneId: id });
        }
        if (updateDto.content.contentType !== undefined) content.contentType = updateDto.content.contentType;
        if (updateDto.content.textBody !== undefined) content.textBody = updateDto.content.textBody;
        if (updateDto.content.imageUrl !== undefined) content.imageUrl = updateDto.content.imageUrl;
        if (updateDto.content.videoUrl !== undefined) content.videoUrl = updateDto.content.videoUrl;
        await queryRunner.manager.save(SceneContent, content);
      }

      // Recreate choices (simplified approach: delete old, create new)
      if (updateDto.choices !== undefined) {
        const oldChoices = await queryRunner.manager.find(PlayerChoice, { where: { sceneId: id } });
        const oldChoiceIds = oldChoices.map(c => c.id);

        if (oldChoiceIds.length > 0) {
          await queryRunner.manager.delete(GameOutcome, { playerChoiceId: In(oldChoiceIds), userId: IsNull() });
          await queryRunner.manager.delete(PlayerChoice, { id: In(oldChoiceIds) });
        }

        for (const choiceDto of updateDto.choices) {
          const choice = this.playerChoiceRepository.create({
            sceneId: id,
            label: choiceDto.label,
            actionType: choiceDto.actionType || 'CHOICE',
            nextSceneId: choiceDto.nextSceneId,
            scoreImpact: choiceDto.scoreImpact || 0,
            influenceImpact: choiceDto.influenceImpact || 0,
          });
          const savedChoice = await queryRunner.manager.save(choice);

          if (choiceDto.outcomes && choiceDto.outcomes.length > 0) {
            for (const outcomeDto of choiceDto.outcomes) {
              const outcome = this.gameOutcomeRepository.create({
                scenarioId: scene.scenarioId,
                playerChoiceId: savedChoice.id,
                outcomeType: outcomeDto.outcomeType,
                score: outcomeDto.score || 0,
                trustScoreDelta: outcomeDto.trustScoreDelta || 0,
                message: outcomeDto.message,
                endScenario: outcomeDto.endScenario || false,
              });
              await queryRunner.manager.save(outcome);
            }
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.sceneRepository.findOne({
        where: { id },
        relations: ['content', 'choices', 'choices.outcomes'],
      }) as unknown as Scene;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteScene(id: string): Promise<void> {
    const scene = await this.sceneRepository.findOne({
      where: { id },
      relations: ['choices', 'choices.outcomes', 'content'],
    });
    if (!scene) throw new NotFoundException('Scene not found');

    // Delete child entities manually to avoid FK violations
    for (const choice of scene.choices || []) {
      if (choice.outcomes?.length) {
        await this.gameOutcomeRepository.delete(choice.outcomes.map((o) => o.id));
      }
    }
    if (scene.choices?.length) {
      await this.playerChoiceRepository.delete(scene.choices.map((c) => c.id));
    }
    if (scene.content) {
      await this.sceneContentRepository.delete(scene.content.id);
    }

    await this.sceneRepository.delete(id);
  }

  async createScenario(createDto: any): Promise<Scenario> {
    const { type, ...rest } = createDto;

    // Map 'type' from frontend to 'scenarioType' in entity
    const scenarioData = {
      ...rest,
      scenarioType: type || rest.scenarioType,
    };

    // Get default game level (Level 1) if not provided
    if (!scenarioData.gameLevelId) {
      const defaultLevel = await this.gameLevelRepository.findOne({
        where: { levelNumber: 1 },
      });
      if (defaultLevel) {
        scenarioData.gameLevelId = defaultLevel.id;
      }
    }

    const scenario = this.scenarioRepository.create(scenarioData);
    return this.scenarioRepository.save(
      Array.isArray(scenario) ? scenario[0] : scenario,
    );
  }

  async updateScenario(
    id: string,
    updateDto: UpdateScenarioDto,
  ): Promise<Scenario> {
    // Map DTO fields to entity column names
    const { type, ...rest } = updateDto as any;
    const entityData: Partial<Scenario> = { ...rest };
    if (type) {
      entityData.scenarioType = type;
    }

    await this.scenarioRepository.update(id, entityData);
    const updated = await this.scenarioRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Scenario not found');
    return updated;
  }

  async deleteScenario(id: string): Promise<void> {
    const result = await this.scenarioRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Scenario not found');
  }

  /**
   * Generate feedback based on outcome
   */
  private generateFeedback(outcomeType: OutcomeType, score: number): string {
    const feedbackMap = {
      [OutcomeType.PERFECT_PASS]: `Outstanding! You demonstrated exceptional critical thinking and took decisive action. Score: ${score}`,
      [OutcomeType.PASS]: `Well done! You successfully identified and countered misinformation. Score: ${score}`,
      [OutcomeType.SUCCESS]: `Excellent work! You successfully navigated the scenario and demonstrated critical thinking skills. Score: ${score}`,
      [OutcomeType.NEUTRAL]: `You're on the right track! Some decisions were spot-on, others need refinement. Score: ${score}`,
      [OutcomeType.PARTIAL_FAIL]: `Close, but not enough. You recognized some warning signs but didn't follow through with action. Score: ${score}`,
      [OutcomeType.FAIL]: `This didn't end well. Review the scenario to understand where things went wrong. Score: ${score}`,
      [OutcomeType.FAILURE]: `Good effort! Review the scenario to understand where misinformation was present. Score: ${score}`,
      [OutcomeType.DEATH]: `Game over! Your choices had severe consequences. Learn from this experience. Score: ${score}`,
    };

    return feedbackMap[outcomeType] || `Game completed. Score: ${score}`;
  }

  /**
   * Get summary of player choices and consequences for the "Investigation Reveal" screen
   */
  async getScenarioSummary(userId: string, progressId: string): Promise<any> {
    console.log(`[EngineService] getScenarioSummary: userId=${userId}, progressId=${progressId}`);
    // Verify progress belongs to user
    const progress = await this.gameProgressRepository.findOne({
      where: { id: progressId, userId },
      relations: ['scenario'],
    });
    console.log(`[EngineService] getScenarioSummary: progress found = ${progress ? 'true' : 'false'}`);
    console.log(`[EngineService] getScenarioSummary: progress object = ${JSON.stringify(progress)}`);

    if (!progress) {
      throw new NotFoundException('Game progress not found');
    }

    // Fetch all outcomes for this specific progress session
    const allOutcomes = await this.gameOutcomeRepository.find({
      where: { progressId, userId },
      relations: ['playerChoice'],
      order: { createdAt: 'ASC' },
    });

    // Filter out system-generated completion outcomes (no playerChoiceId)
    // These are created by completeGame() and don't represent player actions
    const outcomes = allOutcomes.filter((o) => o.playerChoiceId != null);

    // Fetch only the scenes that the player actually interacted with during this session
    // We determine this by checking the sceneId of the choices the player made
    const visitedSceneIds = outcomes.map((o) => o.playerChoice?.sceneId).filter(Boolean);

    const scenes = await this.sceneRepository.find({
      where: {
        id: In(visitedSceneIds)
      },
      relations: ['choices'],
      order: { order: 'ASC' },
    });

    const summary = scenes.map((scene) => {
      const userOutcome = outcomes.find(
        (o) => o.playerChoice?.sceneId === scene.id,
      );

      // Identify the "Best Protocol" choice (highest score impact)
      const bestChoice =
        scene.choices?.length > 0
          ? [...scene.choices].sort(
            (a, b) => (b.scoreImpact || 0) - (a.scoreImpact || 0),
          )[0]
          : null;

      return {
        sceneTitle: scene.title || 'Investigation Phase',
        userAction: userOutcome?.playerChoice?.label || 'Protocol Bypassed',
        userConsequence: userOutcome?.message || 'No direct impact recorded.',
        userTrustDelta: userOutcome?.trustScoreDelta || 0,
        isPerfect:
          userOutcome && bestChoice
            ? userOutcome.playerChoiceId === bestChoice.id
            : false,
        bestAction: bestChoice?.label || 'N/A',
      };
    });

    const totalTrustDelta = outcomes.reduce(
      (sum, o) => sum + (o.trustScoreDelta || 0),
      0,
    );

    return {
      scenarioTitle: progress.scenario.title,
      finalOutcome: progress.finalOutcome,
      totalTrustDelta,
      choices: summary,
    };
  }
}
