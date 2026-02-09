import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scene } from './scene.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { FeedLayoutType } from '../../shared/enums/feed-layout-type.enum';
import { SceneChatMessage } from './scene-chat-message.entity';
import { SceneFeedItem } from './scene-feed-item.entity';

@Entity('scene_content')
export class SceneContent {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;
