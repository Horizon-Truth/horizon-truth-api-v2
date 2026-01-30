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
import { Scenario } from './scenario.entity';
import { Scene } from './scene.entity';
import { GameProgressStatus } from '../../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

@Entity('game_progress')
export class GameProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;