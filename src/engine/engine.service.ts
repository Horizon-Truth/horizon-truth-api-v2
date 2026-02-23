import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { GameLevel } from './entities/game-level.entity';
import { GameProgress } from './entities/game-progress.entity';
import { PlayerAction } from './entities/player-action.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { PlayerChoice } from './entities/player-choice.entity';
import { ScenarioQueryDto } from './dto/scenario-query.dto';
import { SubmitChoiceDto } from './dto/submit-choice.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { GamificationService } from '../gamification/gamification.service';
import { PlayerProfile } from '../players/entities/player-profile.entity';

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
    private dataSource: DataSource,
    @Inject(forwardRef(() => GamificationService))
    private gamificationService: GamificationService,
  ) { }

  /**
   * Get list of scenarios with optional filtering
   */
  async getScenarios(query: ScenarioQueryDto): Promise<any> {
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

    return {
      data: scenarios,
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
      relations: ['gameLevel', 'scenes'],
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
      contentType: scene.contentType,
      content: scene.content || null,
      chatMessages: scene.content?.chatMessages || [],
      feedItems: scene.content?.feedItems || [],
      choices:
        scene.choices?.map((c) => ({
          id: c.id,
          label: c.label,
          actionType: c.actionType,
        })) || [],
      availableChoices: scene.availableChoices || ['VERIFY', 'SHARE', 'IGNORE'],
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

      if (templateOutcome) {
        // Update persistent trust score
        const playerProfile = await queryRunner.manager.findOne(
          PlayerProfile,
          {
            where: { userId },
          },
        );

        if (playerProfile) {
          playerProfile.currentTrustScore =
            (playerProfile.currentTrustScore || 50) +
            (templateOutcome.trustScoreDelta || 0);
          await queryRunner.manager.save(PlayerProfile, playerProfile);
        }

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
        result.trustScoreDelta = templateOutcome.trustScoreDelta;

        // Check badges (Gamification is treated as side-effect, but we can't easily wrap it in this queryRunner's transaction without modifying it)
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

        // 7. Handle scenario termination
        if (templateOutcome.endScenario) {
          await queryRunner.commitTransaction();
          return this.completeGame(progressId, templateOutcome.outcomeType);
        }
      }

      // 8. Advance to next scene
      const nextSceneId = choice?.nextSceneId;
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
          await queryRunner.commitTransaction();
          return this.completeGame(progressId, OutcomeType.SUCCESS);
        }
      }

      await queryRunner.commitTransaction();

      // Refresh progress and return next scene
      result.nextScene = await this.getCurrentScene(progressId);
      result.progress = await this.getGameProgress(progressId);
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

    // Note: Trust score was already updated in submitChoice() when the
    // player made their final decision. No need to update again here.

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
          scenario: {
            id: progress.scenarioId,
            title: progress.scenario.title,
          },
        },
        badgesAwarded,
        progress,
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
          scenario: {
            id: progress.scenarioId,
            title: progress.scenario.title,
          },
        },
        progress,
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
    await this.scenarioRepository.update(id, updateDto);
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
    // Verify progress belongs to user
    const progress = await this.gameProgressRepository.findOne({
      where: { id: progressId, userId },
      relations: ['scenario'],
    });

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

    const summary = outcomes.map((outcome) => ({
      action: outcome.playerChoice?.label || 'Unknown Action',
      consequence: outcome.message || 'No specific impact recorded.',
      trustDelta: outcome.trustScoreDelta,
      outcomeType: outcome.outcomeType,
    }));

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
