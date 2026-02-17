import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Content } from './content.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { IncidentStatus } from './incident-status.entity';
import { ModerationAction } from './moderation-action.entity';

@Entity('incident_reports')
export class IncidentReport {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'content_id' })
  contentId: string;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'reported_by_user_id' })
  reportedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedByUser: User;

  @ApiProperty({ enum: IncidentReportReason })
  @Column({
    name: 'report_reason',
    type: 'enum',
    enum: IncidentReportReason,
  })