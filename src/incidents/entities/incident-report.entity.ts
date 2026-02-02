import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Content } from './content.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { IncidentStatus } from './incident-status.entity';
import { ModerationAction } from './moderation-action.entity';


@Entity('incident_reports')
export class IncidentReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'content_id' })
    contentId: string;

    @ManyToOne(() => Content)
    @JoinColumn({ name: 'content_id' })
    content: Content;

    @Column({ name: 'reported_by_user_id' })
    reportedByUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reported_by_user_id' })
    reportedByUser: User;

    @Column({
        name: 'report_reason',
        type: 'enum',
        enum: IncidentReportReason,
    })
    reportReason: IncidentReportReason;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: IncidentSeverity,
    })
    severity: IncidentSeverity;

    @Column({ name: 'is_anonymous', type: 'boolean', default: false })
    isAnonymous: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => IncidentStatus, (status) => status.incidentReport)
    statusHistory: IncidentStatus[];

    @OneToMany(() => ModerationAction, (action) => action.incidentReport)
    moderationActions: ModerationAction[];
}
