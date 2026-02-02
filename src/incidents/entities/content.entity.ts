import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ReportingContentType } from '../../shared/enums/reporting-content-type.enum';
import { ContentSourcePlatform } from '../../shared/enums/content-source-platform.enum';
import { User } from '../../users/entities/user.entity';

@Entity('contents')
export class Content {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'content_type',
        type: 'enum',
        enum: ReportingContentType,
    })
    contentType: ReportingContentType;

    @Column({
        name: 'source_platform',
        type: 'enum',
        enum: ContentSourcePlatform,
    })
    sourcePlatform: ContentSourcePlatform;

    @Column({ name: 'raw_content', type: 'text' })
    rawContent: string;

    @Column({ name: 'media_url', type: 'text', nullable: true })
    mediaUrl: string;

    @Column({ name: 'external_url', type: 'text', nullable: true })
    externalUrl: string;

    @Column({ nullable: true })
    language: string;

    @Column({ name: 'is_simulated', type: 'boolean', default: false })
    isSimulated: boolean;

    @Column({ name: 'created_by_user_id', nullable: true })
    createdByUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_user_id' })
    createdByUser: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
