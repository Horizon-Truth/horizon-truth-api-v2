import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
  ) {}

  async findAll(query: any): Promise<any> {
    const { isActive, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportTagRepository.createQueryBuilder('tag');

    if (isActive !== undefined) {
      queryBuilder.andWhere('tag.isActive = :isActive', {
        isActive: isActive === 'true',
      });
    }

    if (search) {
      queryBuilder.andWhere(
        'tag.name ILIKE :search OR tag.slug ILIKE :search',