import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import {
  UserSanctionType,
  UserSanctionStatus,
} from '../../shared/enums/user-sanction.enum';

/**
 * One enforcement measure against one account.
 *
 * The account's *current* state lives on `users.status`; this table is the
 * durable history that drives the user's violation record, risk score and any
 * appeal. A restore does not delete rows here — it revokes them.
 */
@Entity('user_sanctions')
@Index(['userId', 'status'])
@Index(['status', 'expiresAt'])
export class UserSanction {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The sanctioned account.' })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ enum: UserSanctionType })
  @Column({ type: 'enum', enum: UserSanctionType })
  type: UserSanctionType;

  @ApiProperty({ enum: UserSanctionStatus, default: UserSanctionStatus.ACTIVE })
  @Column({
    type: 'enum',
    enum: UserSanctionStatus,
    default: UserSanctionStatus.ACTIVE,
  })
  status: UserSanctionStatus;

  @ApiProperty({ description: 'Policy justification shown to the user.' })
  @Column({ type: 'text' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Internal detail, not shown to the user.',
  })
  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Null for warnings, bans and permanent suspensions.',
  })
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @ApiProperty()
  @Column({ name: 'issued_by_id' })
  issuedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by_id' })
  issuedBy: User;

  @ApiPropertyOptional({ description: 'Case that produced this sanction.' })
  @Column({
    type: 'uuid',
    name: 'incident_report_id',
    nullable: true,
  })
  incidentReportId?: string | null;

  @ManyToOne(() => IncidentReport, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'incident_report_id' })
  incidentReport?: IncidentReport | null;

  @ApiPropertyOptional()
  @Column({ name: 'lifted_at', type: 'timestamp', nullable: true })
  liftedAt?: Date | null;

  @ApiPropertyOptional()
  @Column({
    type: 'uuid',
    name: 'lifted_by_id',
    nullable: true,
  })
  liftedById?: string | null;

  @ApiPropertyOptional()
  @Column({ name: 'lift_reason', type: 'text', nullable: true })
  liftReason?: string | null;

  /**
   * Account status to return the user to when this sanction is lifted,
   * captured at issue time so a restore cannot guess wrong.
   */
  @ApiPropertyOptional()
  @Column({ name: 'previous_user_status', type: 'varchar', nullable: true })
  previousUserStatus?: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
