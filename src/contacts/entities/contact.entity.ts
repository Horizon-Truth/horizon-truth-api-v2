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
export class Contact {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'John' })
    @Column({ name: 'first_name' })