import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameLevel } from './game-level.entity';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { Scene } from './scene.entity';

@Entity('scenarios')
export class Scenario {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'game_level_id' })
  gameLevelId: string;

  @ManyToOne(() => GameLevel, (level) => level.scenarios)
  @JoinColumn({ name: 'game_level_id' })
  gameLevel: GameLevel;

  @ApiProperty({ example: 'The Viral Hoax' })
  @Column()
  title: string;

  @ApiPropertyOptional({
    example: 'Investigate a suspicious post spreading on social media.',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ enum: ScenarioType })
  @Column({
    name: 'scenario_type',
    type: 'enum',
    enum: ScenarioType,
  })
  scenarioType: ScenarioType;

  @ApiProperty({ enum: ScenarioDifficulty })
  @Column({
    type: 'enum',
    enum: ScenarioDifficulty,
  })
  difficulty: ScenarioDifficulty;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ default: false })
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Scene, (scene) => scene.scenario)
  @ApiProperty({ type: () => Scene, isArray: true })
  scenes: Scene[];

  @ApiPropertyOptional({ example: 'Learn to identify phishing attempts' })
  @Column({ name: 'learning_objective', type: 'text', nullable: true })
  learningObjective: string;

  @ApiPropertyOptional({ example: 'High risk of data leakage' })
  @Column({ name: 'behavioral_risk', type: 'text', nullable: true })
  behavioralRisk: string;

  @ApiPropertyOptional({ example: 'Fear of missing out (FOMO)' })
  @Column({ name: 'psychological_trigger', type: 'text', nullable: true })
  psychologicalTrigger: string;

  @ApiPropertyOptional({ example: 'Always verify the sender address' })
  @Column({ name: 'prevention_lesson', type: 'text', nullable: true })
  preventionLesson: string;

  @ApiPropertyOptional({ example: 'Cybersecurity' })
  @Column({ name: 'theme', type: 'varchar', length: 255, nullable: true })
  theme: string;

  @ApiProperty({ example: 70 })
  @Column({ name: 'minimum_score', type: 'int', default: 70 })
  minimumScore: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'total_scenes', type: 'int', default: 1 })
  totalScenes: number;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'UUID of scenario that must be passed before this one unlocks' })
  @Column({ name: 'unlock_scenario_id', type: 'uuid', nullable: true })
  unlockScenarioId: string | null;

  @ApiPropertyOptional({ example: 'ELECTION_CAMPAIGN', description: 'Campaign/story arc this scenario belongs to' })
  @Column({ name: 'campaign_tag', type: 'varchar', nullable: true })
  campaignTag: string | null;

  @ApiProperty({ example: 500, description: 'Total possible points achievable in this scenario' })
  @Column({ name: 'total_possible_score', type: 'int', default: 0 })
  totalPossibleScore: number;
}
