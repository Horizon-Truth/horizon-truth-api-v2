import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(Contact)
        private contactsRepository: Repository<Contact>,
    ) { }

    async create(createContactDto: CreateContactDto): Promise<Contact> {
        const contact = this.contactsRepository.create(createContactDto);
        return await this.contactsRepository.save(contact);
    }

    async findAll(): Promise<Contact[]> {
        return await this.contactsRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Contact | null> {
        return await this.contactsRepository.findOne({ where: { id } });
    }

    async remove(id: string): Promise<void> {
        await this.contactsRepository.delete(id);
    }
}
