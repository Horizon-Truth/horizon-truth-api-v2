import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReportingContentType } from '../../shared/enums/reporting-content-type.enum';
import { ContentSourcePlatform } from '../../shared/enums/content-source-platform.enum';
import { User } from '../../users/entities/user.entity';