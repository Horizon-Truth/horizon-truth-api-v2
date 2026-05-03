import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { ContentLanguage } from '../shared/enums/content-language.enum';

export interface BlogQueryOptions {
    /** Restrict results to a single content language. */
    language?: ContentLanguage;
    /** Free-text search within title/excerpt/category. */
    search?: string;
}

@Injectable()
export class BlogsService {
    private readonly logger = new Logger(BlogsService.name);