import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Report } from './report.entity';

@Entity('report_tags')
export class ReportTag {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'Misinformation' })
    @Column({ unique: true })
    name: string;

    @ApiProperty({ example: 'misinformation' })
    @Column({ unique: true })
    slug: string;

    @ApiProperty({ default: true })
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToMany(() => Report, (report) => report.tags)
    reports: Report[];

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
