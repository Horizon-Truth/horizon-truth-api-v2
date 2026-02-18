import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from './organization.entity';
import { OrganizationUserRole } from '../../shared/enums/organization-user-role.enum';
import { OrganizationUserStatus } from '../../shared/enums/organization-user-status.enum';

@Entity('organization_users')
export class OrganizationUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Organization, (organization) => organization.users)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({
        type: 'enum',
        enum: OrganizationUserRole,
        default: OrganizationUserRole.MEMBER,
    })
    role: OrganizationUserRole;

    @Column({
        type: 'enum',
        enum: OrganizationUserStatus,
        default: OrganizationUserStatus.ACTIVE,
    })
    status: OrganizationUserStatus;

    @CreateDateColumn({ name: 'joined_at', type: 'timestamp' })
    joinedAt: Date;
}
