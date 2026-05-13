import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Report } from './report.entity';

@Entity('report_evidence')
export class ReportEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, (report) => report.evidence)
  @JoinColumn({ name: 'report_id' })
  report: Report;

  @Column({ name: 'report_id' })
  reportId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ name: 'author_id', nullable: true })
  authorId?: string;

  @Column({ name: 'author_name', nullable: true })
  authorName?: string;

  @Column({ name: 'evidence_type' })
  evidenceType: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'source_type', nullable: true })
  sourceType?: string;

  @Column({ name: 'credibility_score', type: 'int', default: 0 })
  credibilityScore: number;

  @Column({ name: 'verification_status', default: 'PENDING' })
  verificationStatus: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
