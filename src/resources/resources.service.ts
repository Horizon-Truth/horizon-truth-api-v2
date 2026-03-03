import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@Injectable()
export class ResourcesService {
    constructor(
        @InjectRepository(Resource)
        private readonly resourceRepository: Repository<Resource>,
    ) { }

    async findAll(): Promise<Resource[]> {
        return this.resourceRepository.find();
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
