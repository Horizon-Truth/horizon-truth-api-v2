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

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'scene_id', unique: true })
    sceneId: string;

    @OneToOne(() => Scene, (scene) => scene.content)
    @JoinColumn({ name: 'scene_id' })
    scene: Scene;

    @ApiProperty({ enum: SceneContentType })
    @Column({
        name: 'content_type',
        type: 'enum',
        enum: SceneContentType,
    })
    contentType: SceneContentType;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    // TEXT
    @ApiPropertyOptional({ example: 'Once upon a time...' })
    @Column({ name: 'text_body', type: 'text', nullable: true })
    textBody: string;

    @ApiPropertyOptional({ example: 'en' })
    @Column({ nullable: true })
    language: string;

    // IMAGE
    @ApiPropertyOptional({ example: 'https://example.com/scene.png' })
    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl: string;

    @ApiPropertyOptional({ example: 'A mysterious forest' })
    @Column({ name: 'alt_text', type: 'text', nullable: true })
    altText: string;

    @ApiPropertyOptional({ example: 'The beginning of your journey.' })
    @Column({ type: 'text', nullable: true })
    caption: string;

    // VIDEO
    @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=...' })
    @Column({ name: 'video_url', type: 'text', nullable: true })
    videoUrl: string;

    @ApiPropertyOptional({ example: 'youtube' })
    @Column({ nullable: true })
    provider: string;

    @ApiPropertyOptional({ example: 60 })
    @Column({ name: 'duration_seconds', type: 'int', nullable: true })
    durationSeconds: number;

    @ApiPropertyOptional({ default: false })
    @Column({ type: 'boolean', default: false })
    autoplay: boolean;

    // CHAT
    @ApiPropertyOptional({ default: false })
    @Column({ name: 'allow_user_input', type: 'boolean', default: false })
    allowUserInput: boolean;

    @ApiPropertyOptional({ example: 'Type your response...' })
    @Column({ name: 'input_placeholder', type: 'text', nullable: true })
    inputPlaceholder: string;

    @OneToMany(() => SceneChatMessage, (message) => message.sceneContent)
    @ApiProperty({ type: () => SceneChatMessage, isArray: true })
    chatMessages: SceneChatMessage[];

    // FEED
    @ApiPropertyOptional({ enum: FeedLayoutType })
    @Column({
        name: 'feed_layout',
        type: 'enum',
        enum: FeedLayoutType,
        nullable: true,
    })
    feedLayout: FeedLayoutType;

    @OneToMany(() => SceneFeedItem, (item) => item.sceneContent)
    @ApiProperty({ type: () => SceneFeedItem, isArray: true })
    feedItems: SceneFeedItem[];
}
