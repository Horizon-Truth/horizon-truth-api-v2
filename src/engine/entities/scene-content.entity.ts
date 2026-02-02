import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Scene } from './scene.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { FeedLayoutType } from '../../shared/enums/feed-layout-type.enum';
import { SceneChatMessage } from './scene-chat-message.entity';
import { SceneFeedItem } from './scene-feed-item.entity';


@Entity('scene_content')
export class SceneContent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'scene_id', unique: true })
    sceneId: string;

    @OneToOne(() => Scene, (scene) => scene.content)
    @JoinColumn({ name: 'scene_id' })
    scene: Scene;

    @Column({
        name: 'content_type',
        type: 'enum',
        enum: SceneContentType,
    })
    contentType: SceneContentType;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    // TEXT
    @Column({ name: 'text_body', type: 'text', nullable: true })
    textBody: string;

    @Column({ nullable: true })
    language: string;

    // IMAGE
    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl: string;

    @Column({ name: 'alt_text', type: 'text', nullable: true })
    altText: string;

    @Column({ type: 'text', nullable: true })
    caption: string;

    // VIDEO
    @Column({ name: 'video_url', type: 'text', nullable: true })
    videoUrl: string;

    @Column({ nullable: true })
    provider: string;

    @Column({ name: 'duration_seconds', type: 'int', nullable: true })
    durationSeconds: number;

    @Column({ type: 'boolean', default: false })
    autoplay: boolean;

    // CHAT
    @Column({ name: 'allow_user_input', type: 'boolean', default: false })
    allowUserInput: boolean;

    @Column({ name: 'input_placeholder', type: 'text', nullable: true })
    inputPlaceholder: string;

    @OneToMany(() => SceneChatMessage, (message) => message.sceneContent)
    chatMessages: SceneChatMessage[];

    // FEED
    @Column({
        name: 'feed_layout',
        type: 'enum',
        enum: FeedLayoutType,
        nullable: true,
    })
    feedLayout: FeedLayoutType;

    @OneToMany(() => SceneFeedItem, (item) => item.sceneContent)
    feedItems: SceneFeedItem[];
}
