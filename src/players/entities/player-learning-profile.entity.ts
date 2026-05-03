import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

/**
 * Per-player media-literacy learning ledgers (Horizon Truth 2.0).
 *
 * Mirrors the client-side shapes from
 * frontend/src/modules/gamification/skills.ts and confidence.ts:
 * - skillBook:    { [skillKey]: { xp, correct, total } }
 * - calibration:  { guessing|somewhat|certain: { correct, total } }
 *
 * All counters are monotonic; concurrent device writes are reconciled with an
 * element-wise max merge (see learning-profile.util.ts).
 */
@Entity('player_learning_profiles')
export class PlayerLearningProfile {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    example: { 'source-verification': { xp: 48, correct: 4, total: 5 } },
    description: 'Per-skill XP and accuracy counters, keyed by skill key',
  })
  @Column({ name: 'skill_book', type: 'jsonb', default: () => "'{}'" })
  skillBook: Record<string, { xp: number; correct: number; total: number }>;

  @ApiProperty({
    example: { certain: { correct: 6, total: 8 } },
    description: 'Confidence-vs-accuracy counters per confidence bucket',
  })
  @Column({ type: 'jsonb', default: () => "'{}'" })
  calibration: Record<string, { correct: number; total: number }>;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
