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
import { User } from '../../users/entities/user.entity';

/** What happened. Drives the icon, colour and deep link in the client. */
export enum ModerationNotificationType {
  // --- To moderators ---
  NEW_REPORT = 'NEW_REPORT',
  URGENT_REPORT = 'URGENT_REPORT',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  CASE_ESCALATED = 'CASE_ESCALATED',
  APPEAL_SUBMITTED = 'APPEAL_SUBMITTED',
  HIGH_RISK_CONTENT = 'HIGH_RISK_CONTENT',
  NOTE_MENTION = 'NOTE_MENTION',

  // --- To users ---
  WARNING_ISSUED = 'WARNING_ISSUED',
  CONTENT_REMOVED = 'CONTENT_REMOVED',
  APPEAL_RESULT = 'APPEAL_RESULT',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_RESTORED = 'ACCOUNT_RESTORED',
}

/**
 * In-app notification. Delivery to email is handled separately by
 * `MailModule`; this table is the durable inbox and the read/unread state.
 */
@Entity('moderation_notifications')
@Index(['recipientId', 'readAt'])
@Index(['recipientId', 'createdAt'])
export class ModerationNotification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @ApiProperty({ enum: ModerationNotificationType })
  @Column({ type: 'enum', enum: ModerationNotificationType })
  type: ModerationNotificationType;

  @ApiProperty({ example: 'Case HT-4F2A19 assigned to you' })
  @Column()
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  body: string;

  @ApiPropertyOptional({
    example: '/dashboard/moderation/cases/f47ac10b',
    description: 'Client-side route the notification links to.',
  })
  @Column({ type: 'varchar', nullable: true })
  link?: string | null;

  @ApiPropertyOptional()
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    default: false,
    description: 'Urgent notifications surface as a toast, not just a badge.',
  })
  @Column({ name: 'is_urgent', type: 'boolean', default: false })
  isUrgent: boolean;

  @ApiPropertyOptional()
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
