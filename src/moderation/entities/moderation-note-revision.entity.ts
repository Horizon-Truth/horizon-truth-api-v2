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
import { ModerationNote } from './moderation-note.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Snapshot of a note's body *before* an edit. Written by
 * `ModerationNotesService.update` so an edited note can never be used to
 * rewrite history.
 */
@Entity('moderation_note_revisions')
@Index(['noteId', 'version'])
export class ModerationNoteRevision {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'note_id' })
  noteId: string;

  @ManyToOne(() => ModerationNote, (note) => note.revisions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'note_id' })
  note: ModerationNote;

  @ApiProperty({ description: 'Version number this snapshot replaced.' })
  @Column({ type: 'int' })
  version: number;

  @ApiProperty()
  @Column({ type: 'text' })
  body: string;

  @ApiPropertyOptional({ type: [String] })
  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[] | null;

  @ApiProperty()
  @Column({ name: 'edited_by_id' })
  editedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'edited_by_id' })
  editedBy: User;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
