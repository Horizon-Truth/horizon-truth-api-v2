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
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';

@Entity('moderation_actions')
export class ModerationAction {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'incident_report_id' })
    incidentReportId: string;

    @ManyToOne(() => IncidentReport, (report) => report.moderationActions)
    @JoinColumn({ name: 'incident_report_id' })
    incidentReport: IncidentReport;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'moderator_user_id' })
    moderatorUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'moderator_user_id' })
    moderatorUser: User;

    @ApiProperty({ enum: ModerationActionType })
    @Column({
        type: 'enum',
        enum: ModerationActionType,
    })
    action: ModerationActionType;

    @ApiPropertyOptional({ example: 'Escalated to senior moderator for deep-fake analysis.' })
    @Column({ type: 'text', nullable: true })
    notes: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
