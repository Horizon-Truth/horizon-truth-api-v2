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
export class Scene {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'scenario_id' })
  scenarioId: string;

  @ManyToOne(() => Scenario, (scenario) => scenario.scenes, { onDelete: 'CASCADE' })