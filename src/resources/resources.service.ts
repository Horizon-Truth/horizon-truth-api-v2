import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { ContentLanguage } from '../shared/enums/content-language.enum';

export interface ResourceQueryOptions {
    /** Restrict results to a single content language. */
    language?: ContentLanguage;
    /** Free-text search within title/description. */
    search?: string;
}

@Injectable()
export class ResourcesService {
    private readonly logger = new Logger(ResourcesService.name);

    constructor(
        @InjectRepository(Resource)
        private readonly resourceRepository: Repository<Resource>,
    ) { }

    async findAll(options: ResourceQueryOptions = {}): Promise<Resource[]> {
        const { language, search } = options;