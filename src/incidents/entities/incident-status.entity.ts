import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { IncidentReport } from './incident-report.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentStatusType } from '../../shared/enums/incident-status-type.enum';

@Entity('incident_statuses')
export class IncidentStatus {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'incident_report_id' })
    incidentReportId: string;

    @ManyToOne(() => IncidentReport, (report) => report.statusHistory)
    @JoinColumn({ name: 'incident_report_id' })
    incidentReport: IncidentReport;

    @Column({
        type: 'enum',
        enum: IncidentStatusType,
    })
    status: IncidentStatusType;

    @Column({ name: 'decided_by_user_id', nullable: true })
    decidedByUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'decided_by_user_id' })
    decidedByUser: User;

    @Column({ name: 'decision_reason', type: 'text', nullable: true })
    decisionReason: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
