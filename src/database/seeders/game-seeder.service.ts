import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from '../../engine/entities/scenario.entity';
import { Scene } from '../../engine/entities/scene.entity';
import { SceneContent } from '../../engine/entities/scene-content.entity';
import { Avatar } from '../../players/entities/avatar.entity';
import { Region } from '../../players/entities/region.entity';
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
    @InjectRepository(Region)
    private regionRepository: Repository<Region>,
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
    await this.seedRegions();
    await this.seedBadges();
    await this.seedScenarios();

    this.logger.log('Game data seeding completed!');
  }

  private async seedGameLevels() {
    this.logger.log('Seeding game levels...');

    const levels = [
      {
        levelNumber: 0,
        name: 'Trainee',
        description: 'Begin your journey into truth verification',
      },
      {
        levelNumber: 1,
        name: 'Novice',
        description: 'Just getting started with truth verification',
      },
      {
        levelNumber: 2,
        name: 'Apprentice',
        description: 'Building your fact-checking skills',
      },
      {
        levelNumber: 3,
        name: 'Investigator',
        description: 'Skilled at identifying misinformation',
      },
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
      {
        name: 'Truth Seeker',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TruthSeeker',
        gender: 'NEUTRAL' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Fact Checker',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FactChecker',
        gender: 'FEMALE' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Media Analyst',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MediaAnalyst',
        gender: 'MALE' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Detective',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Detective',
        gender: 'NEUTRAL' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Skeptic',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Skeptic',
        gender: 'FEMALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Digital Native',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DigitalNative',
        gender: 'MALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Data Scout',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DataScout',
        gender: 'FEMALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Truth Apprentice',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TruthApprentice',
        gender: 'NEUTRAL' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Fact Finder',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FactFinder',
        gender: 'FEMALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Guardian',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Guardian',
        gender: 'MALE' as any,
        ageGroup: 'ADULT' as any,
      },
    ];

    for (const avatarData of avatars) {
      const existing = await this.avatarRepository.findOne({
        where: { name: avatarData.name },
      });

      if (!existing) {
        const avatar = this.avatarRepository.create({
          ...avatarData,
          isActive: true,
        });
        await this.avatarRepository.save(avatar);
        this.logger.log(`Created avatar: ${avatarData.name}`);
      }
    }
  }

  private async seedRegions() {
    this.logger.log('Seeding fictional regions...');

    const regions = [
      {
        name: 'Luma City',
        description: 'A vibrant urban center where information flows fast and social media shapes daily life.',
      },
      {
        name: 'Beko Town',
        description: 'A close-knit community where word-of-mouth spreads like wildfire.',
      },
      {
        name: 'Adama Heights',
        description: 'A diverse suburban district with a strong youth activist culture.',
      },
      {
        name: 'Dire Springs',
        description: 'A rural region where limited internet access makes misinformation harder to verify.',
      },
      {
        name: 'Hawassa Bay',
        description: 'A lakeside town with a growing tech scene and active Telegram communities.',
      },
    ];

    for (const regionData of regions) {
      const existing = await this.regionRepository.findOne({
        where: { name: regionData.name },
      });

      if (!existing) {
        const region = this.regionRepository.create({
          ...regionData,
          isActive: true,
        });
        await this.regionRepository.save(region);
        this.logger.log(`Created region: ${regionData.name}`);
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
        const badge = this.badgeRepository.create({
          ...badgeData,
          isActive: true,
        });
        await this.badgeRepository.save(badge);
        this.logger.log(`Created badge: ${badgeData.name}`);
      }
    }
  }

  private async seedScenarios() {
    this.logger.log('Seeding scenarios...');

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 0 — PRIMING PHASE
    // Purpose: Establish player identity, emotional context, and