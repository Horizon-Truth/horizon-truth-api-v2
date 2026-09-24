import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { PlayerProfile } from '../../players/entities/player-profile.entity';

@Entity('users')
export class User {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @Column({ type: 'varchar', unique: true, nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: 'johndoe' })
  @Column({ type: 'varchar', unique: true, nullable: true })
  username?: string | null;

  @ApiPropertyOptional({ example: '+22' })
  @Column({ type: 'varchar', unique: true, nullable: true })
  phone?: string | null;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', name: 'api_key', unique: true, nullable: true })
  apiKey?: string | null;

  @Column({
    name: 'password_hash',
    select: false,
    type: 'text',
    nullable: true,
  })
  passwordHash: string | null;

  @ApiProperty({ example: 'John Doe' })
  @Column({ name: 'full_name' })
  fullName: string;

  @ApiProperty({ enum: UserRole, default: UserRole.PLAYER })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PLAYER,
  })
  role: UserRole;

  @ApiProperty({ enum: UserStatus, default: UserStatus.ACTIVE })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({ default: false })
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @ApiProperty({ default: 'en' })
  @Column({ name: 'preferred_language', type: 'varchar', default: 'en' })
  preferredLanguage: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional()
  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User preferences for notifications, privacy, theme, etc.',
  })
  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    notifications?: { email?: boolean; push?: boolean; sms?: boolean };
    privacy?: { profileVisible?: boolean; activityVisible?: boolean };
    theme?: 'light' | 'dark';
    language?: string;
  } | null;

  // The account-lifecycle columns below are TIMESTAMPTZ (unlike the older naive
  // columns) because the lifecycle job compares them to the application clock.

  @ApiPropertyOptional({
    description:
      'Last authenticated activity (login or API use). Drives the inactive-account policy.',
  })
  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt?: Date | null;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'When the account will be permanently erased: the end of the recovery window after a deletion request, or the end of the notice period for an inactive account.',
  })
  @Column({
    name: 'deletion_scheduled_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletionScheduledAt?: Date | null;

  @Column({
    name: 'inactivity_notice_sent_at',
    type: 'timestamptz',
    nullable: true,
    select: false,
  })
  inactivityNoticeSentAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When personal and gameplay data was erased (tombstone row)',
  })
  @Column({ name: 'purged_at', type: 'timestamptz', nullable: true })
  purgedAt?: Date | null;

  @OneToOne(() => PlayerProfile, (profile) => profile.user)
  playerProfile: PlayerProfile;

  @Column({
    name: 'hashed_refresh_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  hashedRefreshToken?: string | null;

  @Column({
    name: 'reset_password_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  resetPasswordToken?: string | null;

  @Column({
    name: 'reset_password_expires',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  resetPasswordExpires?: Date | null;
}
