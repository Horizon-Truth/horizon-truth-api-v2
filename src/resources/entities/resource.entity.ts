import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ResourceType {
    GUIDE = 'guide',
    VIDEO = 'video',
    COURSE = 'course',
}

@Entity('resources')
export class Resource {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'The Misinformation Handbook' })
    @Column()
    title: string;

    @ApiProperty({ example: 'the-misinformation-handbook' })
    @Column({ unique: true })
    slug: string;

    @ApiProperty({ enum: ResourceType, default: ResourceType.GUIDE })
    @Column({
        type: 'enum',
        enum: ResourceType,
        default: ResourceType.GUIDE,
    })
    type: ResourceType;

    @ApiProperty({ example: 'Learn essential steps to verify social media posts...' })
    @Column({ type: 'text' })
    description: string;

    @ApiProperty({ example: '15 min read' })
    @Column()
    duration: string;

    @ApiProperty({ example: 'Most Popular', nullable: true })
    @Column({ nullable: true })
    badge: string;

    @ApiProperty({ example: 'FileText' })
    @Column()
    icon: string;

    @ApiProperty({ example: 'This handbook provides a step-by-step framework...', nullable: true })
    @Column({ name: 'full_content', type: 'text', nullable: true })
    fullContent: string;

    @ApiProperty({ example: 'https://example.com/resource', nullable: true })
    @Column({ name: 'link_url', nullable: true })
    linkUrl: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
