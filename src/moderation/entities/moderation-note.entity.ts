import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import { ModerationNoteRevision } from './moderation-note-revision.entity';

/**
 * A private note written by a moderator. Never exposed to the subject of the
 * note or to any non-moderator role — the controller layer has no route that
 * returns these to a PLAYER.
 *
 * A note hangs off either a case (`incidentReportId`) or a target
 * (`targetType`/`targetId`, e.g. notes on a user profile), or both.
 */
@Entity('moderation_notes')
@Index(['incidentReportId', 'createdAt'])
@Index(['targetType', 'targetId'])
export class ModerationNote {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'incident_report_id',
    nullable: true,
  })
  incidentReportId?: string | null;

  @ManyToOne(() => IncidentReport, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_report_id' })
  incidentReport?: IncidentReport | null;

  @ApiPropertyOptional({ enum: ModerationTargetType })
  @Column({
    name: 'target_type',
    type: 'enum',
    enum: ModerationTargetType,
    nullable: true,
  })
  targetType?: ModerationTargetType | null;

  @ApiPropertyOptional()
  @Column({ name: 'target_id', type: 'varchar', nullable: true })
  targetId?: string | null;

  @ApiProperty()
  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ApiProperty({
    example: '**Prior history**: two upheld spam reports in March.',
    description: 'Markdown. Rendered client-side with a sanitising renderer.',
  })
  @Column({ type: 'text' })
  body: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Attachment URLs.',
  })
  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[] | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'User ids mentioned with @ in the body; each gets notified.',
  })
  @Column({ name: 'mentioned_user_ids', type: 'jsonb', nullable: true })
  mentionedUserIds?: string[] | null;

  @ApiProperty({
    default: true,
    description: 'Always true today; reserved for future shared-note types.',
  })
  @Column({ name: 'is_internal', type: 'boolean', default: true })
  isInternal: boolean;

  @ApiProperty({ default: 1 })
  @Column({ type: 'int', default: 1 })
  version: number;

  @OneToMany(() => ModerationNoteRevision, (r) => r.note)
  revisions: ModerationNoteRevision[];

  @ApiPropertyOptional()
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
