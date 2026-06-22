import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Report } from './report.entity';

@Entity('report_verifications')
export class ReportVerification {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Report, (report) => report.verifications)
    @JoinColumn({ name: 'report_id' })
    report: Report;

    @Column({ name: 'report_id' })
    reportId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: string;

    @ApiProperty({ example: 'This is false information.' })
    @Column({ type: 'text' })
    comment: string;

    @ApiProperty({ example: 'FALSE' })
    @Column()
    status: string;

    @ApiPropertyOptional({ example: 4 })
    @Column({ type: 'int', nullable: true })
    rating?: number;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
