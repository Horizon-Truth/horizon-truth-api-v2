import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AvatarGender } from '../../shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from '../../shared/enums/avatar-age-group.enum';
