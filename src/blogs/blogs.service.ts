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

    constructor(
        @InjectRepository(Blog)
        private readonly blogRepository: Repository<Blog>,
    ) { }

    async findAll(options: BlogQueryOptions = {}): Promise<Blog[]> {
        const { language, search } = options;

        const qb = this.blogRepository
            .createQueryBuilder('blog')
            .orderBy('blog.publishedAt', 'DESC');

        if (language) {
            qb.andWhere('blog.language = :language', { language });
        }

        if (search) {
            qb.andWhere(
                '(blog.title ILIKE :search OR blog.excerpt ILIKE :search OR blog.category ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const blogs = await qb.getMany();
        this.logger.debug(
            `findAll language=${language ?? 'ALL'} search=${search ?? '-'} -> ${blogs.length} blog(s)`,
        );
        return blogs;
    }

    async findOne(id: string): Promise<Blog> {
        const blog = await this.blogRepository.findOne({ where: { id } });
        if (!blog) {
            throw new NotFoundException(`Blog with ID ${id} not found`);
        }
        return blog;
    }

    async findBySlug(slug: string): Promise<Blog> {
        const blog = await this.blogRepository.findOne({ where: { slug } });
        if (!blog) {
            throw new NotFoundException(`Blog with slug ${slug} not found`);
        }
        return blog;
    }

    async create(createBlogDto: CreateBlogDto): Promise<Blog> {
        const blog = this.blogRepository.create(createBlogDto);
        const saved = await this.blogRepository.save(blog);
        this.logger.debug(`Created blog ${saved.id} in language=${saved.language}`);
        return saved;
    }

    async update(id: string, updateBlogDto: UpdateBlogDto): Promise<Blog> {
        const blog = await this.findOne(id);
        Object.assign(blog, updateBlogDto);
        return this.blogRepository.save(blog);
    }

    async remove(id: string): Promise<void> {
        const blog = await this.findOne(id);
        await this.blogRepository.remove(blog);
    }
}
