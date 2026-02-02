import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { DashboardAccessLevel } from '../../shared/enums/dashboard-access-level.enum';
import { DashboardWidget } from './dashboard-widget.entity';

@Entity('organization_dashboards')
export class OrganizationDashboard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'dashboard_name' })
    dashboardName: string;

    @Column({
        name: 'access_level',
        type: 'enum',
        enum: DashboardAccessLevel,
    })
    accessLevel: DashboardAccessLevel;

    @Column({ name: 'is_default', type: 'boolean', default: false })
    isDefault: boolean;

    @Column({ type: 'simple-json', nullable: true })
    config: any;

    @Column({ name: 'created_by_user_id' })
    createdByUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_user_id' })
    createdByUser: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @OneToMany(() => DashboardWidget, (widget) => widget.organizationDashboard)
    widgets: DashboardWidget[];
}
