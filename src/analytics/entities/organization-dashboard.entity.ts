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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { DashboardAccessLevel } from '../../shared/enums/dashboard-access-level.enum';
import { DashboardWidget } from './dashboard-widget.entity';

@Entity('organization_dashboards')
export class OrganizationDashboard {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @ApiProperty({ example: 'Executive Overview' })
    @Column({ name: 'dashboard_name' })
    dashboardName: string;

    @ApiProperty({ enum: DashboardAccessLevel })
    @Column({
        name: 'access_level',
        type: 'enum',
        enum: DashboardAccessLevel,
    })
    accessLevel: DashboardAccessLevel;

    @ApiProperty({ default: false })
    @Column({ name: 'is_default', type: 'boolean', default: false })
    isDefault: boolean;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { theme: 'dark' } })
    @Column({ type: 'jsonb', nullable: true })
    config: any;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'created_by_user_id' })
    createdByUserId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_user_id' })
    createdByUser: User;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @OneToMany(() => DashboardWidget, (widget) => widget.organizationDashboard)
    @ApiProperty({ type: () => DashboardWidget, isArray: true })
    widgets: DashboardWidget[];
}
