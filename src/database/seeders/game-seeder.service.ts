import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from '../../engine/entities/scenario.entity';
import { Scene } from '../../engine/entities/scene.entity';
import { SceneContent } from '../../engine/entities/scene-content.entity';
import { Avatar } from '../../players/entities/avatar.entity';
import { Badge } from '../../gamification/entities/badge.entity';
import { GameLevel } from '../../engine/entities/game-level.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { PlayerChoice } from '../../engine/entities/player-choice.entity';
import { GameOutcome } from '../../engine/entities/game-outcome.entity';
import { PlayerActionType } from '../../shared/enums/player-action-type.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';
import { BadgeCategory } from '../../shared/enums/badge-category.enum';
import { AvatarGender } from '../../shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from '../../shared/enums/avatar-age-group.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';

@Injectable()
export class GameSeederService {
    private readonly logger = new Logger(GameSeederService.name);

    constructor(
        @InjectRepository(Scenario)
        private scenarioRepository: Repository<Scenario>,
        @InjectRepository(Scene)
        private sceneRepository: Repository<Scene>,
        @InjectRepository(SceneContent)
        private sceneContentRepository: Repository<SceneContent>,
        @InjectRepository(Avatar)
        private avatarRepository: Repository<Avatar>,
        @InjectRepository(Badge)
        private badgeRepository: Repository<Badge>,
        @InjectRepository(GameLevel)
        private gameLevelRepository: Repository<GameLevel>,
        @InjectRepository(PlayerChoice)
        private playerChoiceRepository: Repository<PlayerChoice>,
        @InjectRepository(GameOutcome)
        private gameOutcomeRepository: Repository<GameOutcome>,
    ) { }

    async seed() {
        this.logger.log('Starting game data seeding...');

        await this.seedGameLevels();
        await this.seedAvatars();
        await this.seedBadges();
        await this.seedScenarios();

        this.logger.log('Game data seeding completed!');
    }

    private async seedGameLevels() {
        this.logger.log('Seeding game levels...');

        const levels = [
            { levelNumber: 0, name: 'Trainee', description: 'Begin your journey into truth verification' },
            { levelNumber: 1, name: 'Novice', description: 'Just getting started with truth verification' },
            { levelNumber: 2, name: 'Apprentice', description: 'Building your fact-checking skills' },
            { levelNumber: 3, name: 'Investigator', description: 'Skilled at identifying misinformation' },
            { levelNumber: 4, name: 'Detective', description: 'Expert truth seeker' },
            { levelNumber: 5, name: 'Master', description: 'Elite fact-checker' },
        ];

        for (const levelData of levels) {
            const existing = await this.gameLevelRepository.findOne({
                where: { levelNumber: levelData.levelNumber },
            });

            if (!existing) {
                const level = this.gameLevelRepository.create(levelData);
                await this.gameLevelRepository.save(level);
                this.logger.log(`Created level: ${levelData.name}`);
            }
        }
    }

    private async seedAvatars() {
        this.logger.log('Seeding avatars...');

        const avatars = [
            { name: 'Truth Seeker', imageUrl: '/avatars/truth-seeker.png', gender: 'NEUTRAL' as any, ageGroup: 'ADULT' as any },
            { name: 'Fact Checker', imageUrl: '/avatars/fact-checker.png', gender: 'FEMALE' as any, ageGroup: 'ADULT' as any },
            { name: 'Media Analyst', imageUrl: '/avatars/media-analyst.png', gender: 'MALE' as any, ageGroup: 'ADULT' as any },
            { name: 'Detective', imageUrl: '/avatars/detective.png', gender: 'NEUTRAL' as any, ageGroup: 'ADULT' as any },
            { name: 'Skeptic', imageUrl: '/avatars/skeptic.png', gender: 'FEMALE' as any, ageGroup: 'YOUTH' as any },
            { name: 'Guardian', imageUrl: '/avatars/guardian.png', gender: 'MALE' as any, ageGroup: 'ADULT' as any },
        ];

        for (const avatarData of avatars) {
            const existing = await this.avatarRepository.findOne({
                where: { name: avatarData.name },
            });

            if (!existing) {
                const avatar = this.avatarRepository.create({ ...avatarData, isActive: true });
                await this.avatarRepository.save(avatar);
                this.logger.log(`Created avatar: ${avatarData.name}`);
            }
        }
    }

    private async seedBadges() {
        this.logger.log('Seeding badges...');

        const badges = [
            {
                code: 'FIRST_GAME',
                name: 'First Steps',
                description: 'Completed your first scenario',
                iconUrl: '/badges/first-game.png',
                category: BadgeCategory.ACHIEVEMENT,
            },
            {
                code: 'FACT_FINDER',
                name: 'Fact Finder',
                description: 'Successfully identified misinformation 10 times',
                iconUrl: '/badges/fact-finder.png',
                category: BadgeCategory.ACHIEVEMENT,
            },
            {
                code: 'PERFECT_RUN',
                name: 'Perfect Run',
                description: 'Completed a scenario with a perfect score',
                iconUrl: '/badges/perfect-run.png',
                category: BadgeCategory.ACHIEVEMENT,
            },
            {
                code: 'STREAK_3',
                name: '3-Day Streak',
                description: 'Played for 3 consecutive days',
                iconUrl: '/badges/streak-3.png',
                category: BadgeCategory.PROGRESSION,
            },
            {
                code: 'TOP_10',
                name: 'Top 10',
                description: 'Ranked in the top 10 on the leaderboard',
                iconUrl: '/badges/top-10.png',
                category: BadgeCategory.COMPETITIVE,
            },
            {
                code: 'COMMUNITY_PROTECTOR',
                name: 'Community Protector',
                description: 'Identified a viral misinformation campaign early',
                iconUrl: '/badges/community-protector.png',
                category: BadgeCategory.ACHIEVEMENT,
            },
            {
                code: 'CRISIS_VERIFIER',
                name: 'Crisis Verifier',
                description: 'Successfully identified a high-stakes deepfake',
                iconUrl: '/badges/crisis-verifier.png',
                category: BadgeCategory.ACHIEVEMENT,
            },
        ];

        for (const badgeData of badges) {
            const existing = await this.badgeRepository.findOne({
                where: { code: badgeData.code },
            });

            if (!existing) {
                const badge = this.badgeRepository.create({ ...badgeData, isActive: true });
                await this.badgeRepository.save(badge);
                this.logger.log(`Created badge: ${badgeData.name}`);
            }
        }
    }

    private async seedScenarios() {
        this.logger.log('Seeding scenarios...');

        // LEVEL 0: Social Chat Simulation (Onboarding)
        await this.createScenario({
            title: 'Welcome to Horizon',
            description: 'Learn the basics of identifying truth in a digital world.',
            levelNumber: 0,
            scenarioType: ScenarioType.CHAT_CONVERSATION,
            difficulty: ScenarioDifficulty.EASY,
            scenes: [
                {
                    order: 1,
                    title: 'First Encounter',
                    description: 'Your digital assistant greets you.',
                    sceneType: 'INVESTIGATION',
                    contentType: SceneContentType.CHAT,
                    availableChoices: ['HELLO', 'WHO_ARE_YOU'],
                    content: { textBody: 'Welcome, Agent. I am your Truth Verification Assistant. Ready to begin?' },
                    choices: [
                        { label: 'HELLO', actionType: PlayerActionType.CHOICE, nextSceneTitle: 'The Choice' },
                        { label: 'WHO_ARE_YOU', actionType: PlayerActionType.CHOICE, nextSceneTitle: 'The Choice' }
                    ]
                },
                {
                    order: 2,
                    title: 'The Choice',
                    description: 'Learning about Trust Scores.',
                    sceneType: 'ANALYSIS',
                    contentType: SceneContentType.CHAT,
                    availableChoices: ['TELL_ME_MORE', 'LETS_GO'],
                    content: { textBody: 'Every action you take affects your Trust Score. High score means you are a reliable agent.' },
                    choices: [
                        {
                            label: 'LETS_GO',
                            actionType: PlayerActionType.CHOICE,
                            outcome: { trustScoreDelta: 0, outcomeType: OutcomeType.NEUTRAL, endScenario: true, message: 'Tutorial complete! You are ready for your first real challenge.' }
                        }
                    ]
                }
            ]
        });

        // LEVEL 1: Telegram Scam
        await this.createScenario({
            title: 'The Telegram Trap',
            description: 'Someone is offering an "exclusive" crypto tip in a Telegram group.',
            levelNumber: 1,
            scenarioType: ScenarioType.CHAT_CONVERSATION,
            difficulty: ScenarioDifficulty.EASY,
            scenes: [
                {
                    order: 1,
                    title: 'Suspicious Offer',
                    description: 'A user named "CryptoGod" sends a private message.',
                    sceneType: 'INVESTIGATION',
                    contentType: SceneContentType.CHAT,
                    availableChoices: ['CHECK_PROFILE', 'CLICK_LINK', 'BLOCK'],
                    content: { textBody: 'Hey! I saw you in the group. Want a 500% return on BTC in 2 hours? Just click: bit.ly/easy-btc-profit' },
                    choices: [
                        {
                            label: 'CLICK_LINK',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: -20,
                                outcomeType: OutcomeType.FAIL,
                                endScenario: true,
                                message: 'Your share increased Panic Score of {{reach}} people by {{percent}}%! You fell for a phishing link. Your account has been compromised.'
                            }
                        },
                        { label: 'CHECK_PROFILE', actionType: PlayerActionType.CHOICE, nextSceneTitle: 'Fake Credentials' },
                        {
                            label: 'BLOCK',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: 10,
                                outcomeType: OutcomeType.PASS,
                                endScenario: true,
                                message: 'Excellent. You avoided a common crypto scam by recognizing high-pressure tactics.'
                            }
                        }
                    ]
                },
                {
                    order: 2,
                    title: 'Fake Credentials',
                    description: 'Reviewing the users profile.',
                    sceneType: 'ANALYSIS',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['REPORT', 'BELIEVE'],
                    content: { textBody: 'The profile was created 10 minutes ago and has no mutual contacts. The profile picture is a generic stock photo.' },
                    choices: [
                        {
                            label: 'REPORT',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: 15,
                                outcomeType: OutcomeType.PASS,
                                endScenario: true,
                                message: 'Great job! Reporting these accounts helps keep the community safe.'
                            }
                        }
                    ]
                }
            ]
        });

        // LEVEL 1: X-Bank Phishing
        await this.createScenario({
            title: 'X-Bank Phishing',
            description: 'A critical security alert from your bank.',
            levelNumber: 1,
            scenarioType: ScenarioType.SOCIAL_POST,
            difficulty: ScenarioDifficulty.MEDIUM,
            scenes: [
                {
                    order: 1,
                    title: 'The Urgent SMS',
                    description: 'You receive an SMS from "X-Bank".',
                    sceneType: 'INVESTIGATION',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['LOGIN_NOW', 'CALL_OFFICIAL_NUMBER', 'DELETE'],
                    content: { textBody: 'URGENT: Abnormal activity on your account. Login to verify: x-bank-verify.com/login or your account will be suspended in 30 mins.' },
                    choices: [
                        {
                            label: 'LOGIN_NOW',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: -25,
                                outcomeType: OutcomeType.FAIL,
                                endScenario: true,
                                message: 'You entered your credentials on a fake site. Your savings are now vulnerable.'
                            }
                        },
                        {
                            label: 'CALL_OFFICIAL_NUMBER',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: 20,
                                outcomeType: OutcomeType.PASS,
                                endScenario: true,
                                message: 'The bank confirms it was a scam. Always use official apps or numbers to verify alerts.'
                            }
                        }
                    ]
                }
            ]
        });

        // LEVEL 2: Midnight Witness (Complex Branching)
        await this.createScenario({
            title: 'Midnight Witness',
            description: 'A whistleblower claims to have proof of local government corruption.',
            levelNumber: 2,
            scenarioType: ScenarioType.NEWS_STORY,
            difficulty: ScenarioDifficulty.HARD,
            scenes: [
                {
                    order: 1,
                    title: 'Anonymous Tip',
                    description: 'Sent via encrypted mail.',
                    sceneType: 'INVESTIGATION',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['ANALYZE_METADATA', 'PUBLISH_IMMEDIATELY', 'MEET_WHISTLEBLOWER'],
                    content: { textBody: 'The Mayor is taking bribes for the new harbor project. Here is a photo of the transaction.' },
                    choices: [
                        { label: 'ANALYZE_METADATA', actionType: PlayerActionType.CHOICE, nextSceneTitle: 'Digital Fingerprints' },
                        { label: 'MEET_WHISTLEBLOWER', actionType: PlayerActionType.CHOICE, nextSceneTitle: 'The Dark Alley' },
                        {
                            label: 'PUBLISH_IMMEDIATELY',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: -30,
                                outcomeType: OutcomeType.FAIL,
                                endScenario: true,
                                message: 'The photo was a deepfake created by a political rival. You have committed libel and ruined your reputation.'
                            }
                        }
                    ]
                },
                {
                    order: 2,
                    title: 'Digital Fingerprints',
                    description: 'Checking the file for manipulation.',
                    sceneType: 'ANALYSIS',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['CONFIRM_ORIGIN', 'FLAG_FAKE'],
                    content: { textBody: 'Metadata shows the photo was edited 2 hours ago. Shadow angles don\'t match the clock in the background.' },
                    choices: [
                        {
                            label: 'FLAG_FAKE',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: 25,
                                outcomeType: OutcomeType.PASS,
                                endScenario: true,
                                message: 'Brilliant detection. You identified the "Midnight Witness" as a professional disinformation operation.'
                            }
                        }
                    ]
                },
                {
                    order: 3,
                    title: 'The Dark Alley',
                    description: 'Meeting the source in person.',
                    sceneType: 'DECISION',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['ACCEPT_PAYMENT', 'REJECT_AND_REPORT'],
                    content: { textBody: 'A man in a hood offers you 50,000 to "leak" this specific version of the story. It includes extra accusations.' },
                    choices: [
                        {
                            label: 'ACCEPT_PAYMENT',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: -100,
                                outcomeType: OutcomeType.DEATH,
                                endScenario: true,
                                message: 'You sold your integrity. You are no longer fit to be a truth agent.'
                            }
                        },
                        {
                            label: 'REJECT_AND_REPORT',
                            actionType: PlayerActionType.CHOICE,
                            outcome: {
                                trustScoreDelta: 40,
                                outcomeType: OutcomeType.PASS,
                                endScenario: true,
                                message: 'Heroic integrity. You exposed both the fake news and the attempt to bribe the press.'
                            }
                        }
                    ]
                }
            ]
        });

        this.logger.log('Scenarios seeded successfully');
    }

    private async createScenario(data: any) {
        const existing = await this.scenarioRepository.findOne({
            where: { title: data.title },
        });

        if (existing) {
            this.logger.log(`Scenario already exists: ${data.title}`);
            return;
        }

        // Get the specific game level
        const gameLevel = await this.gameLevelRepository.findOne({
            where: { levelNumber: data.levelNumber ?? 1 },
        });

        const scenario = this.scenarioRepository.create({
            title: data.title,
            description: data.description,
            scenarioType: data.scenarioType,
            difficulty: data.difficulty,
            gameLevelId: gameLevel?.id,
            isActive: true,
        });

        const savedScenario = await this.scenarioRepository.save(scenario);
        this.logger.log(`Created scenario: ${data.title}`);

        const sceneMap = new Map<string, string>(); // Title -> ID

        // Create scenes first
        for (const sceneData of data.scenes) {
            const scene = this.sceneRepository.create({
                scenarioId: savedScenario.id,
                title: sceneData.title,
                description: sceneData.description,
                order: sceneData.order,
                sceneType: sceneData.sceneType,
                contentType: sceneData.contentType,
                availableChoices: sceneData.availableChoices,
                isTerminal: sceneData.isTerminal || false,
            });

            const savedScene = await this.sceneRepository.save(scene);
            sceneMap.set(sceneData.title, savedScene.id);

            // Create scene content
            const content = this.sceneContentRepository.create({
                sceneId: savedScene.id,
                contentType: sceneData.contentType,
                ...sceneData.content,
            });

            await this.sceneContentRepository.save(content);
        }

        // Create choices and their outcomes
        for (const sceneData of data.scenes) {
            const currentSceneId = sceneMap.get(sceneData.title);
            if (!currentSceneId) continue;

            if (sceneData.choices) {
                for (const choiceData of sceneData.choices) {
                    const choice = this.playerChoiceRepository.create({
                        sceneId: currentSceneId,
                        label: choiceData.label,
                        actionType: choiceData.actionType,
                        nextSceneId: choiceData.nextSceneTitle ? sceneMap.get(choiceData.nextSceneTitle) : undefined,
                    });
                    const savedChoice = await this.playerChoiceRepository.save(choice);

                    if (choiceData.outcome) {
                        const outcome = this.gameOutcomeRepository.create({
                            scenarioId: savedScenario.id,
                            playerChoiceId: savedChoice.id,
                            outcomeType: choiceData.outcome.outcomeType,
                            trustScoreDelta: choiceData.outcome.trustScoreDelta,
                            message: choiceData.outcome.message,
                            endScenario: choiceData.outcome.endScenario,
                            score: choiceData.outcome.score || 0,
                        });
                        await this.gameOutcomeRepository.save(outcome);
                    }
                }
            }
        }

        this.logger.log(`Setup ${data.scenes.length} scenes for: ${data.title}`);
    }
}
