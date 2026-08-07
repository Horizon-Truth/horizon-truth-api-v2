import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentReport } from './incident-report.entity';
import { User } from '../../users/entities/user.entity';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';

/**
 * One row per status transition on a case. The case's own `status` column is
 * the current value; this table is the immutable trail of how it got there and
 * is what the review timeline renders alongside `moderation_actions`.
 */
@Entity('incident_statuses')
@Index(['incidentReportId', 'createdAt'])
export class IncidentStatus {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'incident_report_id' })
  incidentReportId: string;

  @ManyToOne(() => IncidentReport, (report) => report.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_report_id' })
  incidentReport: IncidentReport;

  @ApiPropertyOptional({
    enum: ModerationCaseStatus,
    description: 'Null for the first transition (case creation).',
  })
  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ModerationCaseStatus,
    nullable: true,
  })
  fromStatus?: ModerationCaseStatus | null;

  @ApiProperty({ enum: ModerationCaseStatus })
  @Column({
    type: 'enum',
    enum: ModerationCaseStatus,
  })
  status: ModerationCaseStatus;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'decided_by_user_id', nullable: true })
  decidedByUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'decided_by_user_id' })
  decidedByUser: User;

  @ApiPropertyOptional({ example: 'The report was verified by local experts.' })
  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
