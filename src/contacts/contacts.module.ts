import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactReply } from './entities/contact-reply.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Contact, ContactReply])],
    controllers: [ContactsController],
    providers: [ContactsService],
    exports: [ContactsService],
})
export class ContactsModule { }
