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