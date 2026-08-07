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
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';

/**
 * An append-only record of one moderator action. Never updated or deleted —
 * corrections are made by recording a further action.
 *
 * This is the moderation-specific audit trail; `audit_logs` remains the
 * platform-wide HTTP-level trail. Every row written here is mirrored into
 * `audit_logs` by `ModerationAuditService` so investigators can work from
 * either surface.
 */
@Entity('moderation_actions')
@Index(['incidentReportId', 'createdAt'])
@Index(['moderatorUserId', 'createdAt'])
export class ModerationAction {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({
    description: 'Null for actions not tied to a case (e.g. a standalone ban).',
  })
  @Column({
    type: 'uuid',
    name: 'incident_report_id',
    nullable: true,
  })
  incidentReportId?: string | null;

  @ManyToOne(() => IncidentReport, (report) => report.moderationActions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_report_id' })
  incidentReport?: IncidentReport | null;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'moderator_user_id' })
  moderatorUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'moderator_user_id' })
  moderatorUser: User;

  @ApiProperty({ enum: ModerationActionType })
  @Column({
    type: 'enum',
    enum: ModerationActionType,
  })
  action: ModerationActionType;

  @ApiPropertyOptional({
    example: 'Escalated to senior moderator for deep-fake analysis.',
  })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiPropertyOptional({
    example: 'Repeated coordinated posting after a prior warning.',
    description: 'Policy justification. Mandatory for enforcement actions.',
  })
  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @ApiPropertyOptional({ description: 'State before the action, as JSON.' })
  @Column({ name: 'previous_value', type: 'jsonb', nullable: true })
  previousValue?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'State after the action, as JSON.' })
  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Type of the object acted upon.' })
  @Column({ name: 'affected_object_type', type: 'varchar', nullable: true })
  affectedObjectType?: string | null;

  @ApiPropertyOptional({ description: 'Id of the object acted upon.' })
  @Column({ name: 'affected_object_id', type: 'varchar', nullable: true })
  affectedObjectId?: string | null;

  @ApiPropertyOptional()
  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string | null;

  @ApiPropertyOptional()
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
