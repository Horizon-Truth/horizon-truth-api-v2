import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('blogs')
export class Blog {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'The Rise of Synthetic Media' })
    @Column()
    title: string;

    @ApiProperty({ example: 'the-rise-of-synthetic-media' })
    @Column({ unique: true })
    slug: string;

    @ApiProperty({ example: 'As deepfakes and AI-generated content become more sophisticated...' })
    @Column({ type: 'text' })
    excerpt: string;

    @ApiProperty({ example: '<p>Misinformation has taken a new...</p>' })
    @Column({ type: 'text' })
    content: string;

    @ApiProperty({ example: 'Sarah Chen' })
    @Column({ name: 'author_name' })
    authorName: string;

    @ApiProperty({ example: 'AI Researcher' })
    @Column({ name: 'author_role' })
    authorRole: string;

    @ApiProperty({ example: 'https://images.unsplash.com/...' })
    @Column({ name: 'author_avatar', nullable: true })
    authorAvatar: string;

    @ApiProperty({ example: 'https://images.unsplash.com/...' })
    @Column({ name: 'image_url', nullable: true })
    imageUrl: string;

    @ApiProperty({ example: 'Technology' })
    @Column()
    category: string;

    @ApiProperty({ example: '6 min read' })
    @Column({ name: 'read_time' })
    readTime: string;

    @ApiProperty()
    @Column({ name: 'published_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    publishedAt: Date;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
