import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SceneContent } from './scene-content.entity';
import { ChatSender } from '../../shared/enums/chat-sender.enum';

@Entity('scene_chat_messages')
export class SceneChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scene_content_id' })