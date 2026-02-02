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
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';

@Entity('moderation_actions')
export class ModerationAction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'incident_report_id' })
    incidentReportId: string;

    @ManyToOne(() => IncidentReport, (report) => report.moderationActions)
    @JoinColumn({ name: 'incident_report_id' })
    incidentReport: IncidentReport;

    @Column({ name: 'moderator_user_id' })
    moderatorUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'moderator_user_id' })
    moderatorUser: User;

    @Column({
        type: 'enum',
        enum: ModerationActionType,
    })
    action: ModerationActionType;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
