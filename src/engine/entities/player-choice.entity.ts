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
export class PlayerChoice {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'scene_id' })
  sceneId: string;

  @ManyToOne(() => Scene, (scene) => scene.choices)
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @ApiProperty({ example: 'Investigate source' })
  @Column()
  label: string;

  @ApiProperty({ enum: PlayerActionType })
  @Column({
    name: 'action_type',
    type: 'enum',
    enum: PlayerActionType,
  })
  actionType: PlayerActionType;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'next_scene_id', type: 'uuid', nullable: true })
  nextSceneId: string;

  @ManyToOne(() => Scene)
  @JoinColumn({ name: 'next_scene_id' })
  nextScene: Scene;

  @ApiProperty({ example: 10 })
  @Column({ name: 'score_impact', type: 'int', default: 0 })
  scoreImpact: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'influence_impact', type: 'int', default: 0 })
  influenceImpact: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => GameOutcome, (outcome) => outcome.playerChoice)
  @ApiProperty({ type: () => GameOutcome, isArray: true })
  outcomes: GameOutcome[];
}
