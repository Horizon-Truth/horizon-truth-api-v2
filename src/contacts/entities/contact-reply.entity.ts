import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Contact } from './contact.entity';

@Entity('contact_replies')
export class ContactReply {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Contact, (contact) => contact.replies, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({ name: 'contact_id' })
    contactId: string;

    @ApiProperty({ example: 'Re: General Inquiry' })
    @Column()
    subject: string;

    @ApiProperty({ example: 'Thanks for reaching out — here is the answer.' })
    @Column({ type: 'text' })
    message: string;

    @ApiProperty({ example: 'admin@horizon.et', description: 'Admin who sent the reply' })
    @Column({ name: 'sent_by_email' })
    sentByEmail: string;

    @ApiProperty({ required: false })
    // The type must be explicit: TypeORM reflects `string | null` as `Object`.
    @Column({ name: 'sent_by_user_id', type: 'uuid', nullable: true })
    sentByUserId: string | null;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
