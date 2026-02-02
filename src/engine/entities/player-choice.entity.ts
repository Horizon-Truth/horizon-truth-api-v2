import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scene } from './scene.entity';
import { PlayerActionType } from '../../shared/enums/player-action-type.enum';
import { GameOutcome } from './game-outcome.entity';

@Entity('player_choices')