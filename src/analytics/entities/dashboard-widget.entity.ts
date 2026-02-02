import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { OrganizationDashboard } from './organization-dashboard.entity';
import { DashboardWidgetType } from '../../shared/enums/dashboard-widget-type.enum';

@Entity('dashboard_widgets')
export class DashboardWidget {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_dashboard_id' })
    organizationDashboardId: string;

    @ManyToOne(() => OrganizationDashboard, (dashboard) => dashboard.widgets)
    @JoinColumn({ name: 'organization_dashboard_id' })
    organizationDashboard: OrganizationDashboard;

    @Column({
        name: 'widget_type',
        type: 'enum',
        enum: DashboardWidgetType,
    })
    widgetType: DashboardWidgetType;

    @Column()
    title: string;

    @Column({ name: 'data_source', nullable: true })
    dataSource: string;

    @Column({ type: 'jsonb', nullable: true })
    config: any;

    @Column({ type: 'int', default: 0 })
    position: number;

    @Column({ name: 'is_visible', type: 'boolean', default: true })
    isVisible: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
