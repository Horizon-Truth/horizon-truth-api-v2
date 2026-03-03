import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('contacts')
export class Contact {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'John' })
    @Column({ name: 'first_name' })
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @Column({ name: 'last_name' })
    lastName: string;

    @ApiProperty({ example: 'john@example.com' })
    @Column()
    email: string;

    @ApiProperty({ example: 'General Inquiry' })
    @Column()
    subject: string;

    @ApiProperty({ example: 'Hello, I have a question.' })
    @Column({ type: 'text' })
    message: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
