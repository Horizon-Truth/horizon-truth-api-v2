import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { UserSanction } from './user-sanction.entity';
import {
  AppealStatus,
  AppealSubjectType,
} from '../../shared/enums/moderation-appeal.enum';

/**
 * A user's challenge to a moderation decision.
 *
 * Appeals are reviewed by someone who did not take the original decision —
 * `ModerationAppealsService` refuses to let the deciding moderator rule on
 * their own case.
 */
@Entity('moderation_appeals')
@Index(['status', 'createdAt'])
@Index(['appellantId', 'status'])
export class ModerationAppeal {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'AP-9C31D0' })
  @Column({
    name: 'appeal_number',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  appealNumber?: string | null;

  @ApiProperty({ description: 'The user lodging the appeal.' })
  @Column({ name: 'appellant_id' })
  appellantId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appellant_id' })
  appellant: User;

  @ApiProperty({ enum: AppealSubjectType })
  @Column({
    name: 'subject_type',
    type: 'enum',
    enum: AppealSubjectType,
  })
  subjectType: AppealSubjectType;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'incident_report_id',
    nullable: true,
  })
  incidentReportId?: string | null;

  @ManyToOne(() => IncidentReport, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'incident_report_id' })
  incidentReport?: IncidentReport | null;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'sanction_id',
    nullable: true,
  })
  sanctionId?: string | null;

  @ManyToOne(() => UserSanction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sanction_id' })
  sanction?: UserSanction | null;

  @ApiProperty({ example: 'The post was satire and was labelled as such.' })
  @Column({ type: 'text' })
  reason: string;

  @ApiPropertyOptional({ description: 'Further context supplied by the user.' })
  @Column({ name: 'supporting_evidence', type: 'text', nullable: true })
  supportingEvidence?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[] | null;

  @ApiProperty({ enum: AppealStatus, default: AppealStatus.SUBMITTED })
  @Column({ type: 'enum', enum: AppealStatus, default: AppealStatus.SUBMITTED })
  status: AppealStatus;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'reviewer_id',
    nullable: true,
  })
  reviewerId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer?: User | null;

  @ApiPropertyOptional({ description: 'Decision text shown to the appellant.' })
  @Column({ name: 'moderator_response', type: 'text', nullable: true })
  moderatorResponse?: string | null;

  @ApiPropertyOptional()
  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @ApiPropertyOptional()
  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
