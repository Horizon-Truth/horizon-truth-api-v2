import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentReport } from './incident-report.entity';
import { User } from '../../users/entities/user.entity';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';

@Entity('moderation_actions')
export class ModerationAction {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')