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
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';

export enum ContentVisibility {
  VISIBLE = 'VISIBLE',
  /** Hidden from the public but recoverable and still visible to moderators. */
  HIDDEN = 'HIDDEN',
  /** Soft-deleted. Recoverable by a senior moderator within the retention window. */
  DELETED = 'DELETED',
}

/**
 * Moderation overlay for any first-party object.
 *
 * Rather than adding `hidden`/`deleted` columns to every content table, the
 * moderation module keeps one row per moderated object here and content
 * services consult it. That keeps hide/delete/restore uniform across
 * scenarios, scenes, comments, profiles and uploads, and it means a restore
 * always has the pre-action state to return to.
 */
@Entity('content_moderation_states')
@Index('uq_content_moderation_target', ['targetType', 'targetId'], {
  unique: true,
})
export class ContentModerationState {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @ApiProperty({ enum: ContentVisibility, default: ContentVisibility.VISIBLE })
  @Column({
    type: 'enum',
    enum: ContentVisibility,
    default: ContentVisibility.VISIBLE,
  })
  visibility: ContentVisibility;

  @ApiPropertyOptional({
    description: 'Snapshot of the content when actioned.',
  })
  @Column({ type: 'text', nullable: true })
  snapshot?: string | null;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'actioned_by_id',
    nullable: true,
  })
  actionedById?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actioned_by_id' })
  actionedBy?: User | null;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'incident_report_id',
    nullable: true,
  })
  incidentReportId?: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
