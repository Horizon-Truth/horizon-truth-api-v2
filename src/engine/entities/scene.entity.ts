import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scenario } from './scenario.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { SceneContent } from './scene-content.entity';
import { PlayerChoice } from './player-choice.entity';

@Entity('scenes')