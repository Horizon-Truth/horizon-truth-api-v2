import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTag } from './entities/report-tag.entity';
import { CreateReportTagDto } from './dto/create-report-tag.dto';
import { UpdateReportTagDto } from './dto/update-report-tag.dto';

@Injectable()
export class ReportTagsService {
    constructor(
        @InjectRepository(ReportTag)
        private readonly reportTagRepository: Repository<ReportTag>,
    ) { }

    async findAll(query: any): Promise<any> {
        const { isActive, page = 1, limit = 10, search } = query;
        const skip = (page - 1) * limit;

        const queryBuilder = this.reportTagRepository.createQueryBuilder('tag');

        if (isActive !== undefined) {
            queryBuilder.andWhere('tag.isActive = :isActive', { isActive: isActive === 'true' });
        }

        if (search) {
            queryBuilder.andWhere('tag.name ILIKE :search OR tag.slug ILIKE :search', { search: `%${search}%` });
        }

        const [data, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy('tag.name', 'ASC')
            .getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    async findById(id: string): Promise<ReportTag> {
        const tag = await this.reportTagRepository.findOne({ where: { id } });
        if (!tag) throw new NotFoundException('Report tag not found');
        return tag;
    }

    async create(createDto: CreateReportTagDto): Promise<ReportTag> {
        const existing = await this.reportTagRepository.findOne({
            where: [{ name: createDto.name }, { slug: createDto.slug }],
        });
        if (existing) throw new ConflictException('Report tag with this name or slug already exists');

        const tag = this.reportTagRepository.create(createDto);
        return this.reportTagRepository.save(tag);
    }

    async update(id: string, updateDto: UpdateReportTagDto): Promise<ReportTag> {
        const tag = await this.findById(id);

        if (updateDto.name || updateDto.slug) {
            const existing = await this.reportTagRepository.createQueryBuilder('tag')
                .where('(tag.name = :name OR tag.slug = :slug) AND tag.id != :id', {
                    name: updateDto.name || '',
                    slug: updateDto.slug || '',
                    id
                })
                .getOne();

            if (existing) throw new ConflictException('Report tag with this name or slug already exists');
        }

        Object.assign(tag, updateDto);
        return this.reportTagRepository.save(tag);
    }

    async delete(id: string): Promise<void> {
        const result = await this.reportTagRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Report tag not found');
    }
}
