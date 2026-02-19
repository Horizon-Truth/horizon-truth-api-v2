import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportTag)
    private readonly reportTagRepository: Repository<ReportTag>,
  ) {}

  async create(
    createDto: CreateReportDto,
    reporterId: string,
  ): Promise<Report> {
    const { tagIds, ...reportData } = createDto;
    const report = this.reportRepository.create({
      ...reportData,
      reporterId,
    });

    if (tagIds && tagIds.length > 0) {
      const tags = await this.reportTagRepository.findBy({
        id: In(tagIds),
      });
      report.tags = tags;
    }

    return this.reportRepository.save(report);
  }

  async findAll(query: any): Promise<any> {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.tags', 'tags');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('report.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['reporter', 'tags'],
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
