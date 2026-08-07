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

/**
 * A named queue view ("My escalations", "Unassigned critical"). Personal by
 * default; `isShared` publishes it to every moderator.
 */
@Entity('moderation_saved_filters')
@Index(['ownerId', 'name'], { unique: true })
export class ModerationSavedFilter {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ApiProperty({ example: 'Unassigned critical' })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: 'AlertTriangle' })
  @Column({ type: 'varchar', nullable: true })
  icon?: string | null;

  @ApiProperty({
    description: 'Serialised queue query — the same shape as QueryCasesDto.',
  })
  @Column({ type: 'jsonb' })
  query: Record<string, unknown>;

  @ApiProperty({ default: false })
  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared: boolean;

  @ApiProperty({ default: 0 })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
