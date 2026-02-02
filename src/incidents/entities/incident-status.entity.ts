import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentReport } from './incident-report.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentStatusType } from '../../shared/enums/incident-status-type.enum';

@Entity('incident_statuses')
export class IncidentStatus {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'incident_report_id' })
    incidentReportId: string;

    @ManyToOne(() => IncidentReport, (report) => report.statusHistory)
    @JoinColumn({ name: 'incident_report_id' })
    incidentReport: IncidentReport;

    @ApiProperty({ enum: IncidentStatusType })
    @Column({
        type: 'enum',
        enum: IncidentStatusType,
    })
    status: IncidentStatusType;

    @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'decided_by_user_id', nullable: true })
    decidedByUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'decided_by_user_id' })
    decidedByUser: User;

    @ApiPropertyOptional({ example: 'The report was verified by local experts.' })
    @Column({ name: 'decision_reason', type: 'text', nullable: true })
    decisionReason: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
