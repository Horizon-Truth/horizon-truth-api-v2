import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';

@Injectable()
export class BlogsService {
    constructor(
        @InjectRepository(Blog)
        private readonly blogRepository: Repository<Blog>,
    ) { }

    async findAll(): Promise<Blog[]> {
        return this.blogRepository.find({ order: { publishedAt: 'DESC' } });
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
        return this.blogRepository.save(blog);
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
