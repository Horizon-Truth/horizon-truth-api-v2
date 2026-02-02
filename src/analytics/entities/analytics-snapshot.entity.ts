import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { AnalyticsPeriodType } from '../../shared/enums/analytics-period-type.enum';

@Entity('analytics_snapshots')
export class AnalyticsSnapshot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({
        name: 'period_type',
        type: 'enum',
        enum: AnalyticsPeriodType,
    })
    periodType: AnalyticsPeriodType;

    @Column({ name: 'period_start', type: 'timestamp' })
    periodStart: Date;

    @Column({ name: 'period_end', type: 'timestamp' })
    periodEnd: Date;

    @Column({ name: 'total_reports', type: 'int', default: 0 })
    totalReports: number;

    @Column({ name: 'verified_false', type: 'int', default: 0 })
    verifiedFalse: number;

    @Column({ name: 'verified_true', type: 'int', default: 0 })
    verifiedTrue: number;

    @Column({ name: 'avg_trust_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
    avgTrustScore: number;

    @Column({ name: 'engagement_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
    engagementRate: number;

    @Column({ name: 'top_misinfo_themes', type: 'jsonb', nullable: true })
    topMisinfoThemes: any;

    @Column({ name: 'high_risk_regions', type: 'jsonb', nullable: true })
    highRiskRegions: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
