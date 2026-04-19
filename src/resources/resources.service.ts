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

        const qb = this.resourceRepository.createQueryBuilder('resource');

        if (language) {
            qb.andWhere('resource.language = :language', { language });
        }

        if (search) {
            qb.andWhere(
                '(resource.title ILIKE :search OR resource.description ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const resources = await qb.getMany();
        this.logger.debug(
            `findAll language=${language ?? 'ALL'} search=${search ?? '-'} -> ${resources.length} resource(s)`,
        );
        return resources;
    }

    async findOne(id: string): Promise<Resource> {
        const resource = await this.resourceRepository.findOne({ where: { id } });
        if (!resource) {
            throw new NotFoundException(`Resource with ID ${id} not found`);
        }
        return resource;
    }

    async findBySlug(slug: string): Promise<Resource> {
        const resource = await this.resourceRepository.findOne({ where: { slug } });
        if (!resource) {
            throw new NotFoundException(`Resource with slug ${slug} not found`);
        }
        return resource;
    }

    async create(createResourceDto: CreateResourceDto): Promise<Resource> {
        const resource = this.resourceRepository.create(createResourceDto);
        return this.resourceRepository.save(resource);
    }

    async update(id: string, updateResourceDto: UpdateResourceDto): Promise<Resource> {
        const resource = await this.findOne(id);
        Object.assign(resource, updateResourceDto);
        return this.resourceRepository.save(resource);
    }

    async remove(id: string): Promise<void> {
        const resource = await this.findOne(id);
        await this.resourceRepository.remove(resource);
    }
}
