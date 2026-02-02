import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Organization } from '../../organizations/entities/organization.entity';
import { AnalyticsPeriodType } from '../../shared/enums/analytics-period-type.enum';

@Entity('analytics_snapshots')
export class AnalyticsSnapshot {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @ApiProperty({ enum: AnalyticsPeriodType })
    @Column({
        name: 'period_type',
        type: 'enum',
        enum: AnalyticsPeriodType,
    })
    periodType: AnalyticsPeriodType;

    @ApiProperty({ example: '2026-01-01T00:00:00Z' })
    @Column({ name: 'period_start', type: 'timestamp' })
    periodStart: Date;

    @ApiProperty({ example: '2026-01-31T23:59:59Z' })
    @Column({ name: 'period_end', type: 'timestamp' })
    periodEnd: Date;

    @ApiProperty({ example: 150 })
    @Column({ name: 'total_reports', type: 'int', default: 0 })
    totalReports: number;

    @ApiProperty({ example: 45 })
    @Column({ name: 'verified_false', type: 'int', default: 0 })
    verifiedFalse: number;

    @ApiProperty({ example: 105 })
    @Column({ name: 'verified_true', type: 'int', default: 0 })
    verifiedTrue: number;

    @ApiProperty({ example: 78.5 })
    @Column({ name: 'avg_trust_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
    avgTrustScore: number;

    @ApiProperty({ example: 12.4 })
    @Column({ name: 'engagement_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
    engagementRate: number;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { 'politics': 45, 'health': 30 } })
    @Column({ name: 'top_misinfo_themes', type: 'jsonb', nullable: true })
    topMisinfoThemes: any;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { 'region_a': 'high', 'region_b': 'low' } })
    @Column({ name: 'high_risk_regions', type: 'jsonb', nullable: true })
    highRiskRegions: any;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
