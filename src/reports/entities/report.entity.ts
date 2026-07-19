import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { ReportTag } from './report-tag.entity';
import { ReportVerification } from './report-verification.entity';
import { ReportEvidence } from './report-evidence.entity';
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

  @ApiPropertyOptional({ example: 'False Information' })
  @Column({ nullable: true })
  reason?: string;

  @ApiPropertyOptional({ example: 'False Information' })
  @Column({ nullable: true })
  category?: string;

  @ApiPropertyOptional({ example: 'https://example.com/claim' })
  @Column({ name: 'reported_content_reference', nullable: true })
  reportedContentReference?: string;

  @ApiPropertyOptional({ type: [String], example: ['https://example.com/evidence'] })
  @Column({ name: 'evidence_links', type: 'jsonb', nullable: true })
  evidenceLinks?: string[];

  @ApiPropertyOptional({ type: [String], example: ['uuid-1'] })
  @Column({ name: 'related_report_ids', type: 'jsonb', nullable: true })
  relatedReportIds?: string[];

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

  @OneToMany(() => ReportVerification, (verification) => verification.report)
  verifications: ReportVerification[];

  @OneToMany(() => ReportEvidence, (evidence) => evidence.report)
  evidence: ReportEvidence[];

  @ApiProperty({ example: 85, default: 0 })
  @Column({ name: 'credibility_score', type: 'int', default: 0 })
  credibilityScore: number;

  @ApiPropertyOptional({ example: 'Needs more evidence' })
  @Column({ name: 'moderator_notes', type: 'text', nullable: true })
  moderatorNotes?: string;

  @ApiPropertyOptional({ example: false })
  @Column({ name: 'is_duplicate', type: 'boolean', default: false })
  isDuplicate: boolean;

  @ApiPropertyOptional({ example: 'uuid-1' })
  @Column({ name: 'duplicate_of_id', nullable: true })
  duplicateOfId?: string;

  @ApiPropertyOptional({ example: 'uuid-1' })
  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId?: string;

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
