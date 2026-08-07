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
import { ModerationFlag } from './moderation-flag.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';

/**
 * A flag applied to something. Multiple flags per target are expected — the
 * unique constraint only prevents applying the *same* flag twice to the same
 * target while it is still active.
 *
 * Flags are soft-removed (`removedAt`) rather than deleted so the history of
 * what was flagged, by whom and why survives.
 */
@Entity('moderation_flag_assignments')
// Partial unique index: a NULL `removed_at` marks the live rows, and Postgres
// treats NULLs as distinct in a plain unique index — so the predicate is what
// actually blocks a second live copy of the same flag.
@Index('uq_active_flag_per_target', ['flagId', 'targetType', 'targetId'], {
  unique: true,
  where: '"removed_at" IS NULL',
})
@Index(['targetType', 'targetId'])
export class ModerationFlagAssignment {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'flag_id' })
  flagId: string;

  @ManyToOne(() => ModerationFlag, (flag) => flag.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'flag_id' })
  flag: ModerationFlag;

  @ApiProperty({ enum: ModerationTargetType })
  @Column({
    name: 'target_type',
    type: 'enum',
    enum: ModerationTargetType,
  })
  targetType: ModerationTargetType;

  @ApiProperty()
  @Column({ name: 'target_id', type: 'varchar' })
  targetId: string;

  @ApiPropertyOptional({ description: 'Case the flag was applied from.' })
  @Column({
    type: 'uuid',
    name: 'incident_report_id',
    nullable: true,
  })
  incidentReportId?: string | null;

  @ManyToOne(() => IncidentReport, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'incident_report_id' })
  incidentReport?: IncidentReport | null;

  @ApiProperty()
  @Column({ name: 'applied_by_id' })
  appliedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'applied_by_id' })
  appliedBy: User;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  /**
   * Null while the flag is in force. Set — together with `removedById` — when
   * a moderator clears it.
   */
  @ApiPropertyOptional()
  @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
  removedAt?: Date | null;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'removed_by_id',
    nullable: true,
  })
  removedById?: string | null;

  @ApiPropertyOptional()
  @Column({ name: 'removal_reason', type: 'text', nullable: true })
  removalReason?: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
