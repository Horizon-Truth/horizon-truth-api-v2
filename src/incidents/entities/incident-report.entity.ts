import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Content } from './content.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import { IncidentStatus } from './incident-status.entity';
import { ModerationAction } from './moderation-action.entity';

/**
 * A moderation case: something a user reported as unsafe, abusive or
 * misleading, and the moderator work that followed.
 *
 * Table name stays `incident_reports` for backwards compatibility, but the
 * moderation module treats this as the canonical "report" of Q2M2A3.
 */
@Entity('incident_reports')
@Index(['status', 'createdAt'])
@Index(['assignedModeratorId', 'status'])
export class IncidentReport {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Short human-quotable identifier shown in the UI and in user-facing
   * notifications (e.g. `HT-4F2A19`). Generated on insert by the service.
   */
  @ApiProperty({ example: 'HT-4F2A19' })
  @Column({
    name: 'case_number',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  caseNumber?: string | null;

  /**
   * Optional link to a captured `contents` row. Nullable because a case may
   * instead point at a first-party object via `targetType`/`targetId`.
   */
  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({
    type: 'uuid',
    name: 'content_id',
    nullable: true,
  })
  contentId?: string | null;

  @ManyToOne(() => Content, { nullable: true })
  @JoinColumn({ name: 'content_id' })
  content?: Content | null;

  // --- Polymorphic target -------------------------------------------------

  @ApiProperty({ enum: ModerationTargetType })
  @Column({
    name: 'target_type',
    type: 'enum',
    enum: ModerationTargetType,
    default: ModerationTargetType.CAPTURED_CONTENT,
  })
  targetType: ModerationTargetType;

  @ApiPropertyOptional({ description: 'Primary key of the reported object.' })
  @Column({ name: 'target_id', type: 'varchar', nullable: true })
  targetId?: string | null;

  /**
   * Denormalised snapshot of the target taken at report time, so the case
   * still shows what was reported even after the content is edited or deleted.
   */
  @ApiPropertyOptional({ example: 'Vaccines contain tracking microchips…' })
  @Column({ name: 'target_preview', type: 'text', nullable: true })
  targetPreview?: string | null;

  @ApiPropertyOptional({ description: 'Author of the reported content.' })
  @Column({
    type: 'uuid',
    name: 'reported_user_id',
    nullable: true,
  })
  reportedUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser?: User | null;

  // --- Reporter -----------------------------------------------------------

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'reported_by_user_id' })
  reportedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedByUser: User;

  @ApiProperty({
    default: false,
    description:
      'When true the reporter identity is hidden from moderators below ORG_ADMIN.',
  })
  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  // --- Claim --------------------------------------------------------------

  @ApiProperty({ enum: IncidentReportReason })
  @Column({
    name: 'report_reason',
    type: 'enum',
    enum: IncidentReportReason,
  })
  reportReason: IncidentReportReason;

  @ApiPropertyOptional({
    example: 'This post is spreading false information about local elections.',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Evidence URLs, screenshots and attached media.',
  })
  @Column({ name: 'evidence_urls', type: 'jsonb', nullable: true })
  evidenceUrls?: string[] | null;

  @ApiProperty({ enum: IncidentSeverity })
  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    default: IncidentSeverity.MEDIUM,
  })
  severity: IncidentSeverity;

  // --- Workflow -----------------------------------------------------------

  @ApiProperty({
    enum: ModerationCaseStatus,
    default: ModerationCaseStatus.OPEN,
  })
  @Column({
    type: 'enum',
    enum: ModerationCaseStatus,
    default: ModerationCaseStatus.OPEN,
  })
  status: ModerationCaseStatus;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'assigned_moderator_id',
    nullable: true,
  })
  assignedModeratorId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_moderator_id' })
  assignedModerator?: User | null;

  @ApiPropertyOptional()
  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Case this one was merged into.' })
  @Column({
    type: 'uuid',
    name: 'duplicate_of_id',
    nullable: true,
  })
  duplicateOfId?: string | null;

  @ApiPropertyOptional({ description: 'Set when the case is escalated.' })
  @Column({
    type: 'uuid',
    name: 'escalated_to_id',
    nullable: true,
  })
  escalatedToId?: string | null;

  @ApiProperty({ default: 0 })
  @Column({ name: 'reopen_count', type: 'int', default: 0 })
  reopenCount: number;

  @ApiPropertyOptional({ description: 'Free-text outcome summary.' })
  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string | null;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'resolved_by_id',
    nullable: true,
  })
  resolvedById?: string | null;

  @ApiPropertyOptional()
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;

  @ApiPropertyOptional()
  @Column({ name: 'first_reviewed_at', type: 'timestamp', nullable: true })
  firstReviewedAt?: Date | null;

  /**
   * Cached resolution time in seconds, written once on resolve. Keeping it
   * denormalised keeps the analytics queries cheap.
   */
  @ApiPropertyOptional()
  @Column({ name: 'resolution_seconds', type: 'int', nullable: true })
  resolutionSeconds?: number | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => IncidentStatus, (status) => status.incidentReport)
  @ApiProperty({ type: () => IncidentStatus, isArray: true })
  statusHistory: IncidentStatus[];

  @OneToMany(() => ModerationAction, (action) => action.incidentReport)
  @ApiProperty({ type: () => ModerationAction, isArray: true })
  moderationActions: ModerationAction[];
}
