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
