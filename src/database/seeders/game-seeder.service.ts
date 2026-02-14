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

        // Scenario 1: Social Media Viral Post
        await this.createScenario({
            title: 'The Viral Post',
            description: 'A shocking claim goes viral on social media. Can you distinguish fact from fiction?',
            scenarioType: ScenarioType.SOCIAL_POST,
            difficulty: ScenarioDifficulty.EASY,
            scenes: [
                {
                    order: 1,
                    title: 'The Discovery',
                    description: 'You come across a viral post claiming a major health breakthrough',
                    sceneType: 'INVESTIGATION',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['VERIFY', 'SHARE', 'IGNORE'],
                    content: {
                        textBody: 'BREAKING: Scientists discover miracle cure that eliminates all diseases! Shared 50,000 times in the last hour.',
                    },
                },
                {
                    order: 2,
                    title: 'Checking Sources',
                    description: 'You decide to investigate the source of this claim',
                    sceneType: 'ANALYSIS',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['TRUST', 'DOUBT', 'RESEARCH_MORE'],
                    content: {
                        textBody: 'The original post links to a website you\'ve never heard of. No major news outlets are reporting this story.',
                    },
                },
                {
                    order: 3,
                    title: 'The Verdict',
                    description: 'Based on your investigation, what\'s your conclusion?',
                    sceneType: 'DECISION',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['REAL', 'FAKE', 'UNCERTAIN'],
                    content: {
                        textBody: 'You find that the website is known for spreading misinformation. The "scientists" mentioned don\'t exist.',
                    },
                },
            ],
        });

        // Scenario 2: News Article Verification
        await this.createScenario({
            title: 'The Breaking News',
            description: 'A news article makes bold claims. Is it trustworthy?',
            scenarioType: ScenarioType.NEWS_STORY,
            difficulty: ScenarioDifficulty.MEDIUM,
            scenes: [
                {
                    order: 1,
                    title: 'The Headline',
                    description: 'You see a sensational news headline',
                    sceneType: 'INVESTIGATION',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['READ_ARTICLE', 'CHECK_SOURCE', 'SKIP'],
                    content: {
                        textBody: 'SHOCKING: Government Plans to Ban All Social Media Next Week!',
                    },
                },
                {
                    order: 2,
                    title: 'Digging Deeper',
                    description: 'You investigate the article and its sources',
                    sceneType: 'ANALYSIS',
                    contentType: SceneContentType.TEXT,
                    availableChoices: ['BELIEVE', 'DOUBT', 'INVESTIGATE'],
                    content: {
                        textBody: 'The article cites "anonymous sources" and uses dramatic language. Other news sites aren\'t reporting this.',
                    },
                },
            ],
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

        // Get the first game level
        const gameLevel = await this.gameLevelRepository.findOne({
            where: { levelNumber: 1 },
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

        // Create scenes
        for (const sceneData of data.scenes) {
            const scene = this.sceneRepository.create({
                scenarioId: savedScenario.id,
                title: sceneData.title,
                description: sceneData.description,
                order: sceneData.order,
                sceneType: sceneData.sceneType,
                contentType: sceneData.contentType,
                availableChoices: sceneData.availableChoices,
            });

            const savedScene = await this.sceneRepository.save(scene);

            // Create scene content
            const content = this.sceneContentRepository.create({
                sceneId: savedScene.id,
                contentType: sceneData.contentType,
                ...sceneData.content,
            });

            await this.sceneContentRepository.save(content);
            this.logger.log(`Created scene: ${sceneData.title}`);
        }
    }
}
