import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Scene } from '../../engine/entities/scene.entity';

@Entity('player_scene_events')
export class PlayerSceneEvent {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'scene_id' })
  sceneId: string;

  @ManyToOne(() => Scene)
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @ApiProperty()
  @CreateDateColumn({ name: 'viewed_at', type: 'timestamp' })
  viewedAt: Date;

  @ApiProperty()
  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date;

  @ApiProperty({ example: 45 })
  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @ApiProperty()
  @Column({ name: 'choice_selected_at', type: 'timestamp', nullable: true })
  choiceSelectedAt: Date;

  @ApiProperty({ example: 5 })
  @Column({ name: 'reaction_time_seconds', type: 'int', default: 0 })
  reactionTimeSeconds: number;
}
