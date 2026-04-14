import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('newsletters')
export class Newsletter {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'john@example.com' })
    @Column({ unique: true })
    email: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
