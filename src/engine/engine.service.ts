import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';
import { GameProgress } from './entities/game-progress.entity';
import { PlayerAction } from './entities/player-action.entity';
import { GameOutcome } from './entities/game-outcome.entity';
import { ScenarioQueryDto } from './dto/scenario-query.dto';
import { SubmitChoiceDto } from './dto/submit-choice.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { GamificationService } from '../gamification/gamification.service';

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
        @Inject(forwardRef(() => GamificationService))
        private gamificationService: GamificationService,
    ) { }

    /**
     * Get list of scenarios with optional filtering
     */
    async getScenarios(query: ScenarioQueryDto): Promise<any> {
        const { difficulty, scenarioType, isActive, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const queryBuilder = this.scenarioRepository.createQueryBuilder('scenario')
            .leftJoinAndSelect('scenario.gameLevel', 'gameLevel')
            .skip(skip)
            .take(limit);

        if (difficulty) {
            queryBuilder.andWhere('scenario.difficulty = :difficulty', { difficulty });
        }

        if (scenarioType) {
            queryBuilder.andWhere('scenario.scenarioType = :scenarioType', { scenarioType });
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
            throw new NotFoundException(`Game progress with ID ${progressId} not found`);
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
            relations: ['content', 'content.chatMessages', 'content.feedItems'],
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
            content: scene.content || null,
            chatMessages: scene.content?.chatMessages || [],
            feedItems: scene.content?.feedItems || [],
            availableChoices: scene.availableChoices || ['VERIFY', 'SHARE', 'IGNORE'],
        };
    }

    /**
     * Submit a player choice and advance the game
     */
    async submitChoice(userId: string, submitChoiceDto: SubmitChoiceDto): Promise<any> {
        const { progressId, sceneId, choiceKey, metadata } = submitChoiceDto;

        // Verify progress belongs to user
        const progress = await this.gameProgressRepository.findOne({
            where: { id: progressId, userId },
            relations: ['scenario', 'scenario.scenes'],
        });

        if (!progress) {
            throw new NotFoundException('Game progress not found');
        }

        if (progress.status !== GameProgressStatus.IN_PROGRESS) {
            throw new BadRequestException('This game is not in progress');
        }

        // Verify current scene
        if (progress.currentSceneId !== sceneId) {
            throw new BadRequestException('Invalid scene for current progress');
        }

        // Record the player's choice
        const choice = this.playerActionRepository.create({
            userId,
            scenarioId: progress.scenarioId,
            sceneId,
            choiceKey,
            metadata,
        });

        await this.playerActionRepository.save(choice);

        // Get current scene to determine next scene
        const currentScene = await this.sceneRepository.findOne({
            where: { id: sceneId },
        });

        // Find next scene (simple logic: next in order)
        const allScenes = progress.scenario.scenes.sort((a, b) => a.order - b.order);
        const currentIndex = allScenes.findIndex(s => s.id === sceneId);
        const nextScene = allScenes[currentIndex + 1];

        if (nextScene) {
            // Move to next scene
            progress.currentSceneId = nextScene.id;
            await this.gameProgressRepository.save(progress);

            return {
                status: 'scene_completed',
                nextScene: await this.getCurrentScene(progressId),
                progress: await this.getGameProgress(progressId),
            };
        } else {
            // Game completed - this was the last scene
            return this.completeGame(progressId, OutcomeType.SUCCESS);
        }
    }

    /**
     * Complete the game and record outcome
     */
    async completeGame(progressId: string, outcomeType: OutcomeType): Promise<any> {
        const progress = await this.gameProgressRepository.findOne({
            where: { id: progressId },
            relations: ['scenario', 'user'],
        });

        if (!progress) {
            throw new NotFoundException('Game progress not found');
        }

        // Mark as completed
        progress.status = GameProgressStatus.COMPLETED;
        progress.completedAt = new Date();
        progress.finalOutcome = outcomeType;

        await this.gameProgressRepository.save(progress);

        // Calculate score (simple: 100 points per scenario completed)
        const score = 100;

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

        // Trigger badge awards and leaderboard updates
        try {
            const badgesAwarded = await this.gamificationService.checkBadgeEligibility(progress.userId);
            await this.gamificationService.updateLeaderboard(progress.userId);

            return {
                status: 'game_completed',
                outcome: {
                    type: outcomeType,
                    score,
                    feedback: outcome.feedback,
                    scenarioTitle: progress.scenario.title,
                },
                badgesAwarded,
                progress,
            };
        } catch (error) {
            // If gamification fails, still return success
            return {
                status: 'game_completed',
                outcome: {
                    type: outcomeType,
                    score,
                    feedback: outcome.feedback,
                    scenarioTitle: progress.scenario.title,
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
            scenario: scenario ? {
                id: scenario.id,
                title: scenario.title,
            } : null,
        };
    }

    /**
     * Get user's game progress history
     */
    async getUserProgress(userId: string, scenarioId?: string): Promise<GameProgress[]> {
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

    async createScenario(createDto: CreateScenarioDto): Promise<Scenario> {
        const scenario = this.scenarioRepository.create(createDto);
        return this.scenarioRepository.save(scenario);
    }

    async updateScenario(id: string, updateDto: UpdateScenarioDto): Promise<Scenario> {
        await this.scenarioRepository.update(id, updateDto);
        const updated = await this.scenarioRepository.findOne({ where: { id } });
        if (!updated) throw new NotFoundException('Scenario not found');
        return updated;
    }

    async deleteScenario(id: string): Promise<void> {
        const result = await this.scenarioRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Scenario not found');
    }

    /**
     * Generate feedback based on outcome
     */
    private generateFeedback(outcomeType: OutcomeType, score: number): string {
        const feedbackMap = {
            [OutcomeType.SUCCESS]: `Excellent work! You successfully navigated the scenario and demonstrated critical thinking skills. Score: ${score}`,
            [OutcomeType.FAILURE]: `Good effort! Review the scenario to understand where misinformation was present. Score: ${score}`,
            [OutcomeType.NEUTRAL]: `You're on the right track! Some decisions were spot-on, others need refinement. Score: ${score}`,
            [OutcomeType.DEATH]: `Game over! Make better choices next time. Score: ${score}`,
        };

        return feedbackMap[outcomeType] || `Game completed. Score: ${score}`;
    }
}
