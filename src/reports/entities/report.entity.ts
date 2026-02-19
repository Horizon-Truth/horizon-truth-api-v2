import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    ManyToMany,
    JoinTable,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { ReportTag } from './report-tag.entity';
import { ReportStatus } from '../../shared/enums/report-status.enum';
import { ReportContentType } from '../../shared/enums/report-content-type.enum';
import { ReportPriorityLevel } from '../../shared/enums/report-priority-level.enum';

@Entity('reports')
export class Report {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reporter_id' })
    reporter: User;

    @Column({ name: 'reporter_id' })
    reporterId: string;

    @ApiProperty({ example: 'Suspicious Article' })
    @Column()
    title: string;

    @ApiProperty({ example: 'This article contains false information about healthcare.' })
    @Column({ type: 'text' })
    description: string;

    @ApiProperty({ enum: ReportContentType })
    @Column({
        name: 'content_type',
        type: 'enum',
        enum: ReportContentType,
    })
    contentType: ReportContentType;

    @ApiPropertyOptional({ example: 'https://example.com/fake-news' })
    @Column({ name: 'source_url', nullable: true })
    sourceUrl?: string;

    @ApiProperty({ example: 'en' })
    @Column({ length: 10 })
    language: string;

    @ApiProperty({ enum: ReportStatus, default: ReportStatus.NEW })
    @Column({
        type: 'enum',
        enum: ReportStatus,
        default: ReportStatus.NEW,
    })
    status: ReportStatus;

    @ApiProperty({ enum: ReportPriorityLevel, default: ReportPriorityLevel.MEDIUM })
    @Column({
        type: 'enum',
        enum: ReportPriorityLevel,
        default: ReportPriorityLevel.MEDIUM,
    })
    priority: ReportPriorityLevel;

    @ManyToMany(() => ReportTag, (tag) => tag.reports)
    @JoinTable({
        name: 'report_tag_assignments',
        joinColumn: { name: 'report_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    })
    tags: ReportTag[];

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ApiPropertyOptional()
    @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    reviewedAt?: Date;
}
