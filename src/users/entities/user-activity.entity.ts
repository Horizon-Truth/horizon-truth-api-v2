import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_activities')
export class UserActivity {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })