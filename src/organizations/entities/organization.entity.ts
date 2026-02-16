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