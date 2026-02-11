import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Content } from './content.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { IncidentStatus } from './incident-status.entity';