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