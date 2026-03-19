import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Avatar } from './avatar.entity';

@Entity('player_profiles')
export class PlayerProfile {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.playerProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 'FactChecker99' })
  @Column()
  nickname: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'avatar_id' })
  avatarId: string;

  @ManyToOne(() => Avatar)
  @JoinColumn({ name: 'avatar_id' })
  avatar: Avatar;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'fictional_region_id', type: 'uuid', nullable: true })
  fictionalRegionId: string | null;

  @ApiProperty({ example: 0 })
  @Column({ name: 'trust_score_initial', type: 'int', default: 0 })
  trustScoreInitial: number;

  @ApiProperty({ example: 0 })
  @Column({ name: 'current_trust_score', type: 'int', default: 0 })
  currentTrustScore: number;

  @ApiProperty({ example: false })
  @Column({ name: 'onboarding_completed', type: 'boolean', default: false })
  onboardingCompleted: boolean;

  @ApiPropertyOptional()
  @Column({
    name: 'onboarding_completed_at',
    type: 'timestamp',
    nullable: true,
  })
  onboardingCompletedAt: Date;

  @ApiPropertyOptional({
    example: 'FACT_CHECKER',
    description: 'Reputation role: OBSERVER | FACT_CHECKER | TRUSTED_VERIFIER | MODERATOR',
  })
  @Column({ name: 'reputation_role', type: 'varchar', default: 'OBSERVER' })
  reputationRole: string;

  @ApiProperty({ example: 3 })
  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @ApiProperty({ example: 7 })
  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @ApiPropertyOptional()
  @Column({ name: 'last_played_date', type: 'date', nullable: true })
  lastPlayedDate: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
