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