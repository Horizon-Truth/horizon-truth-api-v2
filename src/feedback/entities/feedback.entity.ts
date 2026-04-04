import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scenario } from '../../engine/entities/scenario.entity';
import { User } from '../../users/entities/user.entity';
import { FeedbackPriority } from '../../shared/enums/feedback-priority.enum';
import { FeedbackStatus } from '../../shared/enums/feedback-status.enum';
import { FeedbackType } from '../../shared/enums/feedback-type.enum';

@Entity('feedbacks')
export class Feedback {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'scenario_id', nullable: true })
  scenarioId: string;

  @ManyToOne(() => Scenario, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scenario_id' })
  scenario: Scenario;
