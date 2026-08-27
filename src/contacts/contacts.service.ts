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
  ) {}

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
      await this.contactsRepository.update(contact.id, {
        status: ContactStatus.READ,
      });
      contact.status = ContactStatus.READ;
    }

    return contact;
  }

  async reply(
    id: string,
    replyDto: ReplyContactDto,
    sender: { userId: string | null; email?: string | null },
  ): Promise<ContactReply> {
    // The reply is sent from the shared MAIL_FROM address, so the admin's own
    // address is what routes the visitor's response back to them. Without it
    // the reply would go out unanswerable, and the record below could not be
    // written either — so refuse before anything leaves the server.
    const senderEmail = sender.email?.trim();
    if (!senderEmail) {
      throw new BadRequestException(
        'Your account has no email address on file, so the reply cannot be sent.',
      );
    }

    const contact = await this.findOneOrFail(id);
    const subject = replyDto.subject?.trim() || `Re: ${contact.subject}`;

    await this.mailService.send({
      to: contact.email,
      subject,
      text: this.buildPlainTextEmail(contact, replyDto.message),
      html: this.buildHtmlEmail(contact, replyDto.message),
      replyTo: senderEmail,
    });

    const reply = this.repliesRepository.create({
      contactId: contact.id,
      subject,
      message: replyDto.message,
      sentByEmail: senderEmail,
      sentByUserId: sender.userId,
    });
    const saved = await this.repliesRepository.save(reply);

    await this.contactsRepository.update(contact.id, {
      status: ContactStatus.REPLIED,
      repliedAt: saved.createdAt,
    });

    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.contactsRepository.delete(id);
  }

  private async findOneOrFail(id: string): Promise<Contact> {
    const contact = await this.findOne(id);
    if (!contact) {
      throw new NotFoundException(`Contact submission ${id} was not found`);
    }
    return contact;
  }

  private buildPlainTextEmail(contact: Contact, message: string): string {
    return [
      `Hello ${contact.firstName},`,
      '',
      message,
      '',
      '—',
      'This is a reply to the message you sent us through the Horizon website:',
      '',
      `> Subject: ${contact.subject}`,
      ...contact.message.split('\n').map((line) => `> ${line}`),
    ].join('\n');
  }

  private buildHtmlEmail(contact: Contact, message: string): string {
    const escape = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const body = escape(message).replace(/\n/g, '<br />');
    const original = escape(contact.message).replace(/\n/g, '<br />');

    return `
<div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">
  <p>Hello ${escape(contact.firstName)},</p>
  <p>${body}</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 13px; color: #6b7280;">
    This is a reply to the message you sent us through the Horizon website.
  </p>
  <blockquote style="margin: 0; padding: 8px 16px; border-left: 3px solid #e5e7eb; color: #6b7280; font-size: 13px;">
    <strong>${escape(contact.subject)}</strong><br />
    ${original}
  </blockquote>
</div>`.trim();
  }
}
