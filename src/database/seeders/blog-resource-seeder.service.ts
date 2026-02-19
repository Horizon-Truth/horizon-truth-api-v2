import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from '../../blogs/entities/blog.entity';
import { Resource, ResourceType } from '../../resources/entities/resource.entity';

@Injectable()
export class BlogResourceSeederService {
    private readonly logger = new Logger(BlogResourceSeederService.name);

    constructor(
        @InjectRepository(Blog)
        private readonly blogRepository: Repository<Blog>,