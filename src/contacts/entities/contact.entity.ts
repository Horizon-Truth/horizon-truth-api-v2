import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ContactStatus } from '../../shared/enums/contact-status.enum';
import { ContactReply } from './contact-reply.entity';

@Entity('contacts')