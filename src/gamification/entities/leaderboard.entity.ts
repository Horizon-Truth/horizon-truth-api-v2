import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { LeaderboardType } from '../../shared/enums/leaderboard-type.enum';
import { LeaderboardPeriod } from '../../shared/enums/leaderboard-period.enum';

@Entity('leaderboards')
export class Leaderboard {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;