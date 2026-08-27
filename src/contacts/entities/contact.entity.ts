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

  @ApiProperty({ enum: ContactStatus, example: ContactStatus.NEW })
  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.NEW,
  })
  status: ContactStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'replied_at', type: 'timestamp', nullable: true })
  repliedAt: Date | null;

  @ApiProperty({ type: () => [ContactReply] })
  // No cascade: replies are inserted explicitly, and cascading here makes
  // saving a loaded Contact detach replies that the array does not hold.
  @OneToMany(() => ContactReply, (reply) => reply.contact)
  replies: ContactReply[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
