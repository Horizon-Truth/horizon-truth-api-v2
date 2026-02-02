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

    @ManyToOne(() => SceneContent, (content) => content.feedItems)
    @JoinColumn({ name: 'scene_content_id' })
    sceneContent: SceneContent;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'media_url', type: 'text', nullable: true })
    mediaUrl: string;

    @Column({ name: 'link_url', type: 'text', nullable: true })
    linkUrl: string;

    @Column({ name: 'item_order', type: 'int' })
    itemOrder: number;
}
