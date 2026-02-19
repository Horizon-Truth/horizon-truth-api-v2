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

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @ApiProperty({ example: 'Reviewer' })
  @Column({ name: 'comment_source' })
  commentSource: string;

  @ApiProperty({ example: 'This scenario is too easy.' })
  @Column({ type: 'text' })
  commentText: string;

  @ApiPropertyOptional({ example: 'Increase difficulty of scene 2.' })
  @Column({ name: 'required_action', type: 'text', nullable: true })
  requiredAction: string;

  @ApiProperty({ enum: FeedbackPriority })
  @Column({
    type: 'enum',
    enum: FeedbackPriority,
    default: FeedbackPriority.MEDIUM,
  })
  priority: FeedbackPriority;

  @ApiProperty({ enum: FeedbackStatus })
  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.OPEN,
  })
  status: FeedbackStatus;

  @ApiProperty({ enum: FeedbackType })
  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.SCENARIO,
  })
  type: FeedbackType;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
