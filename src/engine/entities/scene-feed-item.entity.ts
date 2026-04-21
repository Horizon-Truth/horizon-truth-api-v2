import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SceneContent } from './scene-content.entity';

@Entity('scene_feed_items')
export class SceneFeedItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scene_content_id' })
  sceneContentId: string;
