import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { ReportVerification } from './entities/report-verification.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportTag)
    private readonly reportTagRepository: Repository<ReportTag>,
    @InjectRepository(ReportVerification)
    private readonly reportVerificationRepository: Repository<ReportVerification>,
  ) { }

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
    const { status, tagId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.tags', 'tags')
      .leftJoinAndSelect('report.verifications', 'verifications');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (tagId) {
      queryBuilder.andWhere('tags.id = :tagId', { tagId });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('report.createdAt', 'DESC')
      .getManyAndCount();

    // Calculate verification stats for each report
    const processedData = data.map(report => ({
      ...report,
      verificationCount: report.verifications?.length || 0,
    }));

    return {
      data: processedData,
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
      relations: ['reporter', 'tags', 'verifications', 'verifications.user'],
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async addVerification(
    reportId: string,
    userId: string,
    verificationData: { comment: string; status: string; rating?: number },
  ): Promise<ReportVerification> {
    const report = await this.findById(reportId);

    const verification = this.reportVerificationRepository.create({
      ...verificationData,
      reportId,
      userId,
    });

    const saved = await this.reportVerificationRepository.save(verification);

    // Update report credibility score (naive implementation for now)
    const verifications = await this.reportVerificationRepository.findBy({ reportId });
    const positiveCount = verifications.filter(v => v.status === 'TRUE' || v.status === 'VERIFIED').length;
    const negativeCount = verifications.filter(v => v.status === 'FALSE' || v.status === 'FAKE').length;

    // Simplistic credibility score calculation
    if (verifications.length > 0) {
      report.credibilityScore = Math.round((positiveCount / (positiveCount + negativeCount || 1)) * 100);
      await this.reportRepository.save(report);
    }

    return saved;
  }
}
