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
