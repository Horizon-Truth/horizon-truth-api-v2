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
