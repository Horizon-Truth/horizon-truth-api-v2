import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from '../../shared/enums/organization-type.enum';
import { OrganizationStatus } from '../../shared/enums/organization-status.enum';
import { OrganizationUser } from './organization-user.entity';

@Entity('organizations')
export class Organization {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'Truth Watch' })
    @Column()
    name: string;

    @ApiProperty({ enum: OrganizationType })
    @Column({
        type: 'enum',
        enum: OrganizationType,
    })
    type: OrganizationType;

    @ApiPropertyOptional({ example: 'Independent fact-checking organization' })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiProperty({ example: 'Ethiopia' })
    @Column({ default: 'Ethiopia' })
    country: string;

    @ApiPropertyOptional({ example: 'Addis Ababa' })
    @Column({ nullable: true })
    region: string;

    @ApiProperty({ enum: OrganizationStatus, default: OrganizationStatus.ACTIVE })
    @Column({
        type: 'enum',
        enum: OrganizationStatus,
        default: OrganizationStatus.ACTIVE,
    })
    status: OrganizationStatus;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @OneToMany(() => OrganizationUser, (organizationUser) => organizationUser.organization)
    users: OrganizationUser[];
}
