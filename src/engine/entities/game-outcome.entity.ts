import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerChoice } from './player-choice.entity';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

@Entity('game_outcomes')
export class GameOutcome {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')