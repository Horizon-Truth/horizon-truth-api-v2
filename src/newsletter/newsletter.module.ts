import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from './entities/newsletter.entity';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Newsletter])],
    controllers: [NewsletterController],
    providers: [NewsletterService],
    exports: [NewsletterService],
})
export class NewsletterModule { }
