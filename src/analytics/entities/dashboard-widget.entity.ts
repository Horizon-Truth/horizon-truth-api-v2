import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationDashboard } from './organization-dashboard.entity';
import { DashboardWidgetType } from '../../shared/enums/dashboard-widget-type.enum';

@Entity('dashboard_widgets')
export class DashboardWidget {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'organization_dashboard_id' })
    organizationDashboardId: string;

    @ManyToOne(() => OrganizationDashboard, (dashboard) => dashboard.widgets)
    @JoinColumn({ name: 'organization_dashboard_id' })
    organizationDashboard: OrganizationDashboard;

    @ApiProperty({ enum: DashboardWidgetType })
    @Column({
        name: 'widget_type',
        type: 'enum',
        enum: DashboardWidgetType,
    })
    widgetType: DashboardWidgetType;

    @ApiProperty({ example: 'Misinformation Heatmap' })
    @Column()
    title: string;

    @ApiPropertyOptional({ example: 'api/v1/analytics/heatmap' })
    @Column({ name: 'data_source', nullable: true })
    dataSource: string;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { 'refreshInterval': 300 } })
    @Column({ type: 'jsonb', nullable: true })
    config: any;

    @ApiProperty({ example: 0 })
    @Column({ type: 'int', default: 0 })
    position: number;

    @ApiProperty({ default: true })
    @Column({ name: 'is_visible', type: 'boolean', default: true })
    isVisible: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
