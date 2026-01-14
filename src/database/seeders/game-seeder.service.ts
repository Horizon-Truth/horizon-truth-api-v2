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