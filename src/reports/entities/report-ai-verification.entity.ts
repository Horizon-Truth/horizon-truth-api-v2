import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Report } from './report.entity';
import { AiVerificationStatus } from '../../shared/enums/ai-verification-status.enum';
import { AiVerdict } from '../../shared/enums/ai-verdict.enum';

/**
 * A source the AI cited while assessing the claim.
 *
 * Stored as JSONB rather than a table: sources are an immutable snapshot of one
 * attempt, only ever read back with their attempt, and never queried on their own.
 */
export class AiVerificationSource {
  @ApiProperty({ example: 'Fact Checked: Vaccines: Safe and Effective, No Link to Autism' })
  title: string;

  @ApiProperty({ example: 'https://www.aap.org/en/news-room/fact-checked/...' })
  url: string;

  @ApiPropertyOptional({ example: 'Immunizations work by prompting your immune system...' })
  content?: string;

  @ApiPropertyOptional({ example: 0.74, description: 'Relevance in the 0–1 range' })
  score?: number;
}

/**
 * One AI verification attempt for a crowdsourced report.
 *
 * Attempts are append-only: re-verification inserts a new row so the history of
 * what the AI said, and when, stays auditable. The newest row is "the current
 * result"; older rows stay untouched.
 */
@Entity('report_ai_verifications')
// Named to match the migration so a synchronize-driven schema and a
// migration-driven one converge on the same index rather than duplicating it.
@Index('idx_report_ai_verifications_report_created', ['reportId', 'createdAt'])
export class ReportAiVerification {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, (report) => report.aiVerifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: Report;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column({ name: 'report_id' })
  reportId: string;

  /** The cleaned claim that was actually sent to the AI, not the raw report text. */
  @ApiProperty({ example: 'Vaccines cause autism' })
  @Column({ type: 'text' })
  claim: string;

  @ApiProperty({ enum: AiVerificationStatus, default: AiVerificationStatus.PENDING })
  @Column({ type: 'varchar', length: 32, default: AiVerificationStatus.PENDING })
  status: AiVerificationStatus;

  @ApiPropertyOptional({ example: 'FALSE', description: 'Known values in AiVerdict; may evolve' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  verdict?: AiVerdict | string;

  @ApiPropertyOptional({ example: 'High' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  confidence?: string;

  @ApiPropertyOptional({ example: 'Extensive scientific research has found no credible link...' })
  @Column({ type: 'text', nullable: true })
  reasoning?: string;

  @ApiPropertyOptional({ example: 'Vaccines do not cause autism; extensive research...' })
  @Column({ name: 'evidence_summary', type: 'text', nullable: true })
  evidenceSummary?: string;

  @ApiPropertyOptional({ type: [AiVerificationSource] })
  @Column({ type: 'jsonb', nullable: true })
  sources?: AiVerificationSource[];

  @ApiPropertyOptional({ example: 'ai.horizontruth.org' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  provider?: string;

  @ApiPropertyOptional({ example: 'horizon-detect' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  model?: string;

  /**
   * Operator-facing failure detail. Deliberately a short, sanitised reason —
   * never a stack trace or upstream body, since this is served to clients.
   */
  @ApiPropertyOptional({ example: 'The AI verification service timed out.' })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy?: User;

  /** Null when the attempt was created automatically on report submission. */
  @ApiPropertyOptional()
  @Column({ name: 'requested_by_id', nullable: true })
  requestedById?: string;

  /**
   * Timestamps are `timestamptz`, not the naive `timestamp` used by older
   * tables: the cooldown and stale-attempt guards compare these against the
   * application clock, and an app server in a different timezone from Postgres
   * would otherwise read every attempt as hours old.
   */
  @ApiPropertyOptional()
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
