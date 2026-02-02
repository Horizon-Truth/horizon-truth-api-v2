import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { HeatmapRegionType } from '../../shared/enums/heatmap-region-type.enum';
import { HeatmapRiskLevel } from '../../shared/enums/heatmap-risk-level.enum';

@Entity('misinformation_heatmaps')
export class MisinformationHeatmap {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({
        name: 'region_type',
        type: 'enum',
        enum: HeatmapRegionType,
    })
    regionType: HeatmapRegionType;

    @Column({ name: 'region_name' })
    regionName: string;

    @Column()
    theme: string;

    @Column({ name: 'incident_count', type: 'int', default: 0 })
    incidentCount: number;

    @Column({
        name: 'risk_level',
        type: 'enum',
        enum: HeatmapRiskLevel,
    })
    riskLevel: HeatmapRiskLevel;

    @Column({ name: 'snapshot_period', type: 'timestamp' })
    snapshotPeriod: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
