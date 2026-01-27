import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { PlayerProfile } from '../../players/entities/player-profile.entity';
