import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { OrganizationType } from 'src/shared/enums/organization-type.enum';
import { OrganizationStatus } from 'src/shared/enums/organization-status.enum';
import { OrganizationUser } from './organization-user.entity';


@Entity('organizations')
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: OrganizationType,
    })
    type: OrganizationType;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: 'Ethiopia' })
    country: string;

    @Column({ nullable: true })
    region: string;

    @Column({
        type: 'enum',
        enum: OrganizationStatus,
        default: OrganizationStatus.ACTIVE,
    })
    status: OrganizationStatus;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @OneToMany(() => OrganizationUser, (organizationUser) => organizationUser.organization)
    users: OrganizationUser[];
}
