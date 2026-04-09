import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { ContactReply } from './entities/contact-reply.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';
import { ContactStatus } from '../shared/enums/contact-status.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(Contact)
        private contactsRepository: Repository<Contact>,
        @InjectRepository(ContactReply)
        private repliesRepository: Repository<ContactReply>,
        private mailService: MailService,
    ) { }

    async create(createContactDto: CreateContactDto): Promise<Contact> {
        const contact = this.contactsRepository.create(createContactDto);
        return await this.contactsRepository.save(contact);
    }

    async findAll(): Promise<Contact[]> {
        return await this.contactsRepository.find({
            relations: ['replies'],
            order: { createdAt: 'DESC', replies: { createdAt: 'ASC' } },
        });
    }

    async findOne(id: string): Promise<Contact | null> {
        return await this.contactsRepository.findOne({
            where: { id },
            relations: ['replies'],
            order: { replies: { createdAt: 'ASC' } },
        });
    }

    async markAsRead(id: string): Promise<Contact> {
        const contact = await this.findOneOrFail(id);

        // Never downgrade a submission that has already been answered.
        if (contact.status === ContactStatus.NEW) {
            // A targeted update, so the loaded `replies` relation is untouched.