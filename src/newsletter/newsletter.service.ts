import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Newsletter } from './entities/newsletter.entity';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';

@Injectable()
export class NewsletterService {
    constructor(
        @InjectRepository(Newsletter)
        private newsletterRepository: Repository<Newsletter>,
    ) { }

    async create(createNewsletterDto: CreateNewsletterDto): Promise<Newsletter> {
        const existing = await this.newsletterRepository.findOne({
            where: { email: createNewsletterDto.email },
        });
        if (existing) {
            throw new ConflictException('Email already subscribed');
        }
        const newsletter = this.newsletterRepository.create(createNewsletterDto);
        return await this.newsletterRepository.save(newsletter);
    }

    async findAll(): Promise<Newsletter[]> {
        return await this.newsletterRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async remove(id: string): Promise<void> {
        await this.newsletterRepository.delete(id);
    }
}
