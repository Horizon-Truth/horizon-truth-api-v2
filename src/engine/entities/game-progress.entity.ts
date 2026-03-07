import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Scenario } from './scenario.entity';
import { Scene } from './scene.entity';
import { GameProgressStatus } from '../../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

@Entity('game_progress')
export class GameProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'scenario_id' })
  scenarioId: string;

  @ManyToOne(() => Scenario)
  @JoinColumn({ name: 'scenario_id' })
  scenario: Scenario;

  @Column({ name: 'current_scene_id', nullable: true })
  currentSceneId: string;

  @ManyToOne(() => Scene)
  @JoinColumn({ name: 'current_scene_id' })
  currentScene: Scene;

  @Column({
    type: 'enum',
    enum: GameProgressStatus,
    default: GameProgressStatus.IN_PROGRESS,
  })
  status: GameProgressStatus;

  @Column({
    name: 'final_outcome',
    type: 'enum',
    enum: OutcomeType,
    nullable: true,
  })
  finalOutcome: OutcomeType;

  @CreateDateColumn({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'total_score', type: 'int', default: 0 })
  totalScore: number;

  @Column({ name: 'influence_score', type: 'int', default: 0 })
  influenceScore: number;

  @Column({ name: 'passed', type: 'boolean', default: false })
  passed: boolean;

  @ApiPropertyOptional({
    example: 'TRUTH_VICTORY',
    description: 'Narrative ending: TRUTH_VICTORY | CONTAINED_EARLY | VIRAL_MISINFORMATION | COMMUNITY_CRISIS',
  })
  @Column({ name: 'narrative_ending', type: 'varchar', nullable: true })
  narrativeEnding: string;

  @ApiProperty({ example: 5, description: 'Total number of choices made in this game session' })
  @Column({ name: 'total_decisions', type: 'int', default: 0 })
  totalDecisions: number;

  @ApiProperty({ example: 4, description: 'Number of correct (positive score impact) decisions in this session' })
  @Column({ name: 'correct_decisions', type: 'int', default: 0 })
  correctDecisions: number;

  @ApiProperty({ example: 80, description: 'Real-time accuracy percentage (0-100)' })
  @Column({ name: 'accuracy_rate', type: 'int', default: 0 })
  accuracyRate: number;
}
