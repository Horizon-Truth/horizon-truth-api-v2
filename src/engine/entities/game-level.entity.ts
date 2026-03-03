import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scenario } from './scenario.entity';

@Entity('game_levels')
export class GameLevel {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 1 })
  @Column({ name: 'level_number', type: 'int' })
  levelNumber: number;

  @ApiProperty({ example: 'The Basics of Misinformation' })