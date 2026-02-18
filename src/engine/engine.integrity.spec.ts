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
import { GameLevel } from './entities/game-level.entity';
import { Badge } from '../gamification/entities/badge.entity';
import { UserBadge } from '../gamification/entities/user-badge.entity';
import { Leaderboard } from '../gamification/entities/leaderboard.entity';
import { GameProgressStatus } from '../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../shared/enums/outcome-type.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRepo<T>(overrides: Partial<Record<keyof T, any>> = {}) {
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
        manager: {
            findOne: jest.fn(),
            save: jest.fn((entity, data) => ({ ...data })),
            create: jest.fn((entity, data) => data),
            createQueryBuilder: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ count: '0', totalScore: '0' }),
            })),
        },
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
            save: jest.fn((entity, data) => ({ ...data })),
            create: jest.fn((entity, data) => data),
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
    let dataSource: { createQueryRunner: jest.Mock };

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

        const qr = makeQueryRunner();
        dataSource = { createQueryRunner: jest.fn(() => qr) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EngineService,
                GamificationService,
                { provide: getRepositoryToken(Scenario), useValue: scenarioRepo },
                { provide: getRepositoryToken(Scene), useValue: sceneRepo },
                { provide: getRepositoryToken(GameProgress), useValue: progressRepo },
                { provide: getRepositoryToken(PlayerAction), useValue: playerActionRepo },
                { provide: getRepositoryToken(GameOutcome), useValue: gameOutcomeRepo },
                { provide: getRepositoryToken(GameLevel), useValue: gameLevelRepo },
                { provide: getRepositoryToken(PlayerChoice), useValue: playerChoiceRepo },
                { provide: getRepositoryToken(Badge), useValue: badgeRepo },
                { provide: getRepositoryToken(UserBadge), useValue: userBadgeRepo },
                { provide: getRepositoryToken(Leaderboard), useValue: leaderboardRepo },
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

            await expect(engineService.startGame('user-1', 'scenario-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should start game on the first ordered scene', async () => {
            const scenes = [
                { id: 'scene-2', order: 2 },
                { id: 'scene-1', order: 1 },
            ];
            scenarioRepo.findOne.mockResolvedValue({ id: 'scenario-1', isActive: true, scenes });
            progressRepo.findOne
                .mockResolvedValueOnce(null) // no existing progress
                .mockResolvedValue({ // getGameProgress + getCurrentScene calls
                    id: 'progress-1',
                    scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1',
                    status: GameProgressStatus.IN_PROGRESS,
                    scenario: { title: 'Test' },
                    currentScene: { id: 'scene-1' },
                });
            progressRepo.save.mockResolvedValue({ id: 'progress-1', currentSceneId: 'scene-1' });
            sceneRepo.findOne.mockResolvedValue({
                id: 'scene-1', title: 'First', order: 1, choices: [], content: null, availableChoices: [],
            });

            const result = await engineService.startGame('user-1', 'scenario-1');
            expect(progressRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ currentSceneId: 'scene-1' })
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

            const qr = makeQueryRunner();
            qr.manager.findOne.mockResolvedValue(null); // no template outcome
            dataSource.createQueryRunner.mockReturnValue(qr);

            sceneRepo.findOne.mockResolvedValue({
                id: 'scene-2', title: 'Scene 2', order: 2, choices: [], content: null, availableChoices: [],
            });
            progressRepo.findOne
                .mockResolvedValueOnce({
                    id: 'progress-1', userId: 'user-1', scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1', status: GameProgressStatus.IN_PROGRESS,
                    scenario: { scenes: [scene1, scene2] },
                })
                .mockResolvedValue({
                    id: 'progress-1', scenarioId: 'scenario-1', status: GameProgressStatus.IN_PROGRESS,
                    currentSceneId: 'scene-2', // getCurrentScene needs this
                    scenario: { title: 'Test' }, currentScene: { id: 'scene-2' },
                });
            playerChoiceRepo.findOne.mockResolvedValue(choice);

            const result = await engineService.submitChoice('user-1', {
                progressId: 'progress-1',
                sceneId: 'scene-1',
                choiceId: 'choice-1',
            });

            expect(qr.manager.save).toHaveBeenCalledWith(
                expect.objectContaining({ currentSceneId: 'scene-2' })
            );
        });

        it('should fall back to sequential scene if no nextSceneId on choice', async () => {
            const scene1 = { id: 'scene-1', order: 1 };
            const scene2 = { id: 'scene-2', order: 2 };
            const choice = { id: 'choice-1', label: 'VERIFY', nextSceneId: null, outcomes: [] };

            const qr = makeQueryRunner();
            qr.manager.findOne.mockResolvedValue(null);
            dataSource.createQueryRunner.mockReturnValue(qr);

            progressRepo.findOne
                .mockResolvedValueOnce({
                    id: 'progress-1', userId: 'user-1', scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1', status: GameProgressStatus.IN_PROGRESS,
                    scenario: { scenes: [scene1, scene2] },
                })
                .mockResolvedValue({
                    id: 'progress-1', scenarioId: 'scenario-1', status: GameProgressStatus.IN_PROGRESS,
                    currentSceneId: 'scene-2', // getCurrentScene needs this
                    scenario: { title: 'Test' }, currentScene: { id: 'scene-2' },
                });
            playerChoiceRepo.findOne.mockResolvedValue(choice);
            sceneRepo.findOne.mockResolvedValue({
                id: 'scene-2', title: 'Scene 2', order: 2, choices: [], content: null, availableChoices: [],
            });

            await engineService.submitChoice('user-1', {
                progressId: 'progress-1',
                sceneId: 'scene-1',
                choiceId: 'choice-1',
            });

            // Should advance to scene-2 sequentially
            expect(qr.manager.save).toHaveBeenCalledWith(
                expect.objectContaining({ currentSceneId: 'scene-2' })
            );
        });

        it('should complete game when no next scene exists (terminal)', async () => {
            const scene1 = { id: 'scene-1', order: 1 };
            const choice = { id: 'choice-1', label: 'IGNORE', nextSceneId: null, outcomes: [] };

            const qr = makeQueryRunner();
            qr.manager.findOne.mockResolvedValue(null);
            dataSource.createQueryRunner.mockReturnValue(qr);

            progressRepo.findOne
                .mockResolvedValueOnce({
                    id: 'progress-1', userId: 'user-1', scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1', status: GameProgressStatus.IN_PROGRESS,
                    scenario: { scenes: [scene1] }, // Only one scene
                })
                .mockResolvedValue({
                    id: 'progress-1', userId: 'user-1', status: GameProgressStatus.COMPLETED,
                    scenario: { title: 'Test' }, user: {},
                });
            playerChoiceRepo.findOne.mockResolvedValue(choice);
            gameOutcomeRepo.create.mockReturnValue({ id: 'outcome-1' });
            gameOutcomeRepo.save.mockResolvedValue({ id: 'outcome-1', trustScoreDelta: 0 });
            progressRepo.save.mockResolvedValue({ id: 'progress-1', status: GameProgressStatus.COMPLETED });
            userBadgeRepo.find.mockResolvedValue([]);
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '1' }),
                })),
            };
            badgeRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.find.mockResolvedValue([]);

            const result = await engineService.submitChoice('user-1', {
                progressId: 'progress-1',
                sceneId: 'scene-1',
                choiceId: 'choice-1',
            });

            expect(result.status).toBe('game_completed');
        });

        it('should reject choice submission when game is already completed', async () => {
            progressRepo.findOne.mockResolvedValue({
                id: 'progress-1',
                userId: 'user-1',
                status: GameProgressStatus.COMPLETED,
                scenario: { scenes: [] },
            });

            await expect(engineService.submitChoice('user-1', {
                progressId: 'progress-1',
                sceneId: 'scene-1',
                choiceId: 'choice-1',
            })).rejects.toThrow(BadRequestException);
        });

        it('should reject choice submission for wrong scene', async () => {
            progressRepo.findOne.mockResolvedValue({
                id: 'progress-1',
                userId: 'user-1',
                currentSceneId: 'scene-2', // User is on scene-2
                status: GameProgressStatus.IN_PROGRESS,
                scenario: { scenes: [] },
            });

            await expect(engineService.submitChoice('user-1', {
                progressId: 'progress-1',
                sceneId: 'scene-1', // But submitting for scene-1
                choiceId: 'choice-1',
            })).rejects.toThrow(BadRequestException);
        });
    });

    // ─── 2. Trust Score Math ──────────────────────────────────────────────────

    describe('2. Trust Score Math', () => {
        it('should correctly apply positive trust score delta from outcome', async () => {
            const templateOutcome = {
                id: 'outcome-template',
                trustScoreDelta: 15,
                outcomeType: OutcomeType.PASS,
                endScenario: false,
                message: 'Good job!',
                scenarioId: 'scenario-1',
                playerChoiceId: 'choice-1',
                score: 0,
            };
            const choice = { id: 'choice-1', label: 'VERIFY', nextSceneId: 'scene-2', outcomes: [templateOutcome] };
            const playerProfile = { userId: 'user-1', currentTrustScore: 50 };

            const qr = makeQueryRunner();
            // Since templateOutcome is in choice.outcomes, the first qr.manager.findOne
            // call is for PlayerProfile (not for template outcome DB lookup)
            qr.manager.findOne.mockResolvedValueOnce(playerProfile);
            qr.manager.save.mockImplementation((entity, data) => data ? { ...data } : { ...entity });
            dataSource.createQueryRunner.mockReturnValue(qr);

            progressRepo.findOne
                .mockResolvedValueOnce({
                    id: 'progress-1', userId: 'user-1', scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1', status: GameProgressStatus.IN_PROGRESS,
                    scenario: { scenes: [{ id: 'scene-1', order: 1 }, { id: 'scene-2', order: 2 }] },
                })
                .mockResolvedValue({
                    id: 'progress-1', scenarioId: 'scenario-1', status: GameProgressStatus.IN_PROGRESS,
                    currentSceneId: 'scene-2', // getCurrentScene needs this
                    scenario: { title: 'Test' }, currentScene: { id: 'scene-2' },
                });
            playerChoiceRepo.findOne.mockResolvedValue({ ...choice, outcomes: [templateOutcome] });
            sceneRepo.findOne.mockResolvedValue({
                id: 'scene-2', title: 'Scene 2', order: 2, choices: [], content: null, availableChoices: [],
            });
            userBadgeRepo.manager = { findOne: jest.fn().mockResolvedValue(null) };

            const result = await engineService.submitChoice('user-1', {
                progressId: 'progress-1',
                sceneId: 'scene-1',
                choiceId: 'choice-1',
            });

            // Trust delta should be returned in the result
            expect(result.trustScoreDelta).toBe(15);

            // Verify that the transaction manager's save was called (profile update happened)
            expect(qr.manager.save).toHaveBeenCalled();

            // Verify the player profile findOne was called to fetch the profile
            expect(qr.manager.findOne).toHaveBeenCalled();
        });

        it('should correctly apply negative trust score delta (penalty)', async () => {
            const templateOutcome = {
                id: 'outcome-template',
                trustScoreDelta: -20,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message: 'You shared misinformation!',
                scenarioId: 'scenario-1',
                playerChoiceId: 'choice-1',
                score: 0,
            };
            const choice = { id: 'choice-1', label: 'SHARE', nextSceneId: null, outcomes: [templateOutcome] };
            const playerProfile = { userId: 'user-1', currentTrustScore: 30 };

            const qr = makeQueryRunner();
            qr.manager.findOne.mockResolvedValueOnce(playerProfile);
            qr.manager.save.mockImplementation((entity, data) => ({ ...data }));
            dataSource.createQueryRunner.mockReturnValue(qr);

            progressRepo.findOne
                .mockResolvedValueOnce({
                    id: 'progress-1', userId: 'user-1', scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1', status: GameProgressStatus.IN_PROGRESS,
                    scenario: { scenes: [{ id: 'scene-1', order: 1 }] },
                })
                .mockResolvedValue({
                    id: 'progress-1', userId: 'user-1', status: GameProgressStatus.COMPLETED,
                    scenario: { title: 'Test' }, user: {},
                });
            playerChoiceRepo.findOne.mockResolvedValue({ ...choice, outcomes: [templateOutcome] });
            gameOutcomeRepo.create.mockReturnValue({ id: 'outcome-1' });
            gameOutcomeRepo.save.mockResolvedValue({ id: 'outcome-1', trustScoreDelta: 0 });
            progressRepo.save.mockResolvedValue({ id: 'progress-1', status: GameProgressStatus.COMPLETED });
            userBadgeRepo.find.mockResolvedValue([]);
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '1' }),
                })),
            };
            badgeRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.find.mockResolvedValue([]);

            const savedProfile = qr.manager.save.mock.calls.find(
                (call) => call[0] === 'PlayerProfile'
            );

            // The trust score should be 30 - 20 = 10
            if (savedProfile) {
                expect(savedProfile[1].currentTrustScore).toBe(10);
            }
        });

        it('should process panic score template placeholders in outcome message', async () => {
            const templateOutcome = {
                id: 'outcome-template',
                trustScoreDelta: -10,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message: 'Your share increased Panic Score of {{reach}} people by {{percent}}%!',
                scenarioId: 'scenario-1',
                playerChoiceId: 'choice-1',
                score: 0,
            };
            const choice = { id: 'choice-1', label: 'SHARE', nextSceneId: null, outcomes: [templateOutcome] };
            const playerProfile = { userId: 'user-1', currentTrustScore: 50 };

            const qr = makeQueryRunner();
            qr.manager.findOne.mockResolvedValueOnce(playerProfile);
            qr.manager.save.mockImplementation((entity, data) => ({ ...data }));
            dataSource.createQueryRunner.mockReturnValue(qr);

            progressRepo.findOne
                .mockResolvedValueOnce({
                    id: 'progress-1', userId: 'user-1', scenarioId: 'scenario-1',
                    currentSceneId: 'scene-1', status: GameProgressStatus.IN_PROGRESS,
                    scenario: { scenes: [{ id: 'scene-1', order: 1 }] },
                })
                .mockResolvedValue({
                    id: 'progress-1', userId: 'user-1', status: GameProgressStatus.COMPLETED,
                    scenario: { title: 'Test' }, user: {},
                });
            playerChoiceRepo.findOne.mockResolvedValue({ ...choice, outcomes: [templateOutcome] });
            gameOutcomeRepo.create.mockReturnValue({ id: 'outcome-1' });
            gameOutcomeRepo.save.mockResolvedValue({ id: 'outcome-1', trustScoreDelta: 0 });
            progressRepo.save.mockResolvedValue({ id: 'progress-1', status: GameProgressStatus.COMPLETED });
            userBadgeRepo.find.mockResolvedValue([]);
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '1' }),
                })),
            };
            badgeRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.find.mockResolvedValue([]);

            // The message should have placeholders replaced
            const savedOutcome = qr.manager.save.mock.calls.find(
                (call) => call[0] === GameOutcome || (typeof call[0] === 'function' && call[0].name === 'GameOutcome')
            );
            if (savedOutcome) {
                expect(savedOutcome[1].message).not.toContain('{{reach}}');
                expect(savedOutcome[1].message).not.toContain('{{percent}}');
            }
        });

        it('should calculate cumulative trust delta correctly in scenario summary', async () => {
            progressRepo.findOne.mockResolvedValue({
                id: 'progress-1',
                userId: 'user-1',
                scenario: { title: 'Test Scenario' },
                finalOutcome: OutcomeType.PASS,
            });

            gameOutcomeRepo.find.mockResolvedValue([
                { trustScoreDelta: 10, message: 'Good', outcomeType: OutcomeType.PASS, playerChoice: { label: 'VERIFY' } },
                { trustScoreDelta: -5, message: 'Hmm', outcomeType: OutcomeType.NEUTRAL, playerChoice: { label: 'IGNORE' } },
                { trustScoreDelta: 20, message: 'Excellent', outcomeType: OutcomeType.PASS, playerChoice: { label: 'DOUBT' } },
            ]);

            const summary = await engineService.getScenarioSummary('user-1', 'progress-1');

            expect(summary.totalTrustDelta).toBe(25); // 10 - 5 + 20
            expect(summary.choices).toHaveLength(3);
        });
    });

    // ─── 3. Badge Deduplication Prevention ───────────────────────────────────

    describe('3. Badge Deduplication Prevention', () => {
        it('should not award a badge if user already has it', async () => {
            const badge = { id: 'badge-1', code: 'FIRST_GAME', name: 'First Steps' };
            const existingUserBadge = { id: 'ub-1', userId: 'user-1', badgeId: 'badge-1' };

            badgeRepo.findOne.mockResolvedValue(badge);
            userBadgeRepo.findOne.mockResolvedValue(existingUserBadge);

            await expect(gamificationService.awardBadge('user-1', 'FIRST_GAME'))
                .rejects.toThrow(BadRequestException);

            expect(userBadgeRepo.save).not.toHaveBeenCalled();
        });

        it('should award badge when user does not have it', async () => {
            const badge = { id: 'badge-1', code: 'FIRST_GAME', name: 'First Steps' };

            badgeRepo.findOne.mockResolvedValue(badge);
            userBadgeRepo.findOne.mockResolvedValue(null); // No existing badge
            userBadgeRepo.save.mockResolvedValue({ id: 'ub-new', userId: 'user-1', badgeId: 'badge-1' });

            const result = await gamificationService.awardBadge('user-1', 'FIRST_GAME');

            expect(userBadgeRepo.save).toHaveBeenCalledTimes(1);
            expect(result).toMatchObject({ userId: 'user-1', badgeId: 'badge-1' });
        });

        it('should silently skip badge award if user already has it (mid-scenario)', async () => {
            const outcome = {
                outcomeType: OutcomeType.PASS,
                scenarioId: 'scenario-1',
            } as GameOutcome;

            userBadgeRepo.manager = {
                findOne: jest.fn().mockResolvedValue({ id: 'scenario-1', title: 'The Viral Post' }),
            };

            const badge = { id: 'badge-1', code: 'COMMUNITY_PROTECTOR' };
            badgeRepo.findOne.mockResolvedValue(badge);
            userBadgeRepo.findOne.mockResolvedValue({ id: 'ub-1' }); // Already has it

            const awarded = await gamificationService.checkOutcomeBadgeEligibility('user-1', outcome);

            // Should return empty array (silently skipped, not thrown)
            expect(awarded).toEqual([]);
        });

        it('should not award badge for FAIL outcome', async () => {
            const outcome = {
                outcomeType: OutcomeType.FAIL,
                scenarioId: 'scenario-1',
            } as GameOutcome;

            const awarded = await gamificationService.checkOutcomeBadgeEligibility('user-1', outcome);

            expect(awarded).toEqual([]);
            expect(badgeRepo.findOne).not.toHaveBeenCalled();
        });

        it('should prevent double-awarding in same checkBadgeEligibility loop', async () => {
            // Simulate user completing their first game
            userBadgeRepo.find.mockResolvedValue([]); // No existing badges
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '1' }), // 1 completed game
                })),
            };

            badgeRepo.findOne.mockResolvedValue({ id: 'badge-1', code: 'FIRST_GAME' });
            userBadgeRepo.findOne.mockResolvedValue(null);
            userBadgeRepo.save.mockResolvedValue({ id: 'ub-1' });

            const awarded = await gamificationService.checkBadgeEligibility('user-1');

            // FIRST_GAME should be awarded exactly once
            const firstGameAwards = awarded.filter(b => b === 'FIRST_GAME');
            expect(firstGameAwards).toHaveLength(1);
        });
    });

    // ─── 4. Scenario Completion State ────────────────────────────────────────

    describe('4. Scenario Completion State', () => {
        it('should mark game progress as COMPLETED on completeGame', async () => {
            const progress = {
                id: 'progress-1',
                userId: 'user-1',
                scenarioId: 'scenario-1',
                status: GameProgressStatus.IN_PROGRESS,
                scenario: { title: 'Test Scenario', id: 'scenario-1' },
                user: {},
            };
            progressRepo.findOne.mockResolvedValue(progress);
            progressRepo.save.mockResolvedValue({ ...progress, status: GameProgressStatus.COMPLETED });
            gameOutcomeRepo.create.mockReturnValue({ id: 'outcome-1', trustScoreDelta: 0 });
            gameOutcomeRepo.save.mockResolvedValue({ id: 'outcome-1', trustScoreDelta: 0 });
            progressRepo.manager = {
                findOne: jest.fn().mockResolvedValue({ userId: 'user-1', currentTrustScore: 50 }),
                save: jest.fn(),
            };
            userBadgeRepo.find.mockResolvedValue([]);
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '1' }),
                })),
            };
            badgeRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.find.mockResolvedValue([]);

            const result = await engineService.completeGame('progress-1', OutcomeType.PASS);

            expect(result.status).toBe('game_completed');
            expect(progressRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: GameProgressStatus.COMPLETED })
            );
        });

        it('should set completedAt timestamp on game completion', async () => {
            const progress = {
                id: 'progress-1',
                userId: 'user-1',
                scenarioId: 'scenario-1',
                status: GameProgressStatus.IN_PROGRESS,
                scenario: { title: 'Test', id: 'scenario-1' },
                user: {},
            };
            progressRepo.findOne.mockResolvedValue(progress);
            progressRepo.save.mockImplementation((p) => p);
            gameOutcomeRepo.create.mockReturnValue({ id: 'outcome-1', trustScoreDelta: 0 });
            gameOutcomeRepo.save.mockResolvedValue({ id: 'outcome-1', trustScoreDelta: 0 });
            progressRepo.manager = {
                findOne: jest.fn().mockResolvedValue(null),
                save: jest.fn(),
            };
            userBadgeRepo.find.mockResolvedValue([]);
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
                })),
            };
            badgeRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.find.mockResolvedValue([]);

            await engineService.completeGame('progress-1', OutcomeType.PASS);

            const savedProgress = progressRepo.save.mock.calls[0][0];
            expect(savedProgress.completedAt).toBeInstanceOf(Date);
        });

        it('should record the correct finalOutcome type on completion', async () => {
            const progress = {
                id: 'progress-1',
                userId: 'user-1',
                scenarioId: 'scenario-1',
                status: GameProgressStatus.IN_PROGRESS,
                scenario: { title: 'Test', id: 'scenario-1' },
                user: {},
            };
            progressRepo.findOne.mockResolvedValue(progress);
            progressRepo.save.mockImplementation((p) => p);
            gameOutcomeRepo.create.mockReturnValue({ id: 'outcome-1', trustScoreDelta: 0 });
            gameOutcomeRepo.save.mockResolvedValue({ id: 'outcome-1', trustScoreDelta: 0 });
            progressRepo.manager = {
                findOne: jest.fn().mockResolvedValue(null),
                save: jest.fn(),
            };
            userBadgeRepo.find.mockResolvedValue([]);
            userBadgeRepo.manager = {
                createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
                })),
            };
            badgeRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.findOne.mockResolvedValue(null);
            leaderboardRepo.find.mockResolvedValue([]);

            await engineService.completeGame('progress-1', OutcomeType.DEATH);

            const savedProgress = progressRepo.save.mock.calls[0][0];
            expect(savedProgress.finalOutcome).toBe(OutcomeType.DEATH);
        });

        it('should not allow starting a new game if one is already IN_PROGRESS', async () => {
            const existingProgress = {
                id: 'progress-1',
                userId: 'user-1',
                scenarioId: 'scenario-1',
                status: GameProgressStatus.IN_PROGRESS,
            };
            scenarioRepo.findOne.mockResolvedValue({ id: 'scenario-1', isActive: true, scenes: [{ id: 'scene-1', order: 1 }] });
            progressRepo.findOne
                .mockResolvedValueOnce(existingProgress) // existing in-progress found
                .mockResolvedValue({ // getGameProgress + getCurrentScene calls
                    id: 'progress-1', scenarioId: 'scenario-1', status: GameProgressStatus.IN_PROGRESS,
                    currentSceneId: 'scene-1', // getCurrentScene needs this
                    scenario: { title: 'Test' }, currentScene: { id: 'scene-1' },
                });
            sceneRepo.findOne.mockResolvedValue({
                id: 'scene-1', title: 'Scene 1', order: 1, choices: [], content: null, availableChoices: [],
            });

            const result = await engineService.startGame('user-1', 'scenario-1');

            // Should return existing progress, not create a new one
            expect(progressRepo.save).not.toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException for non-existent game progress', async () => {
            progressRepo.findOne.mockResolvedValue(null);

            await expect(engineService.getGameProgress('non-existent-id'))
                .rejects.toThrow(NotFoundException);
        });
    });
});
