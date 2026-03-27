import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { ReportVerification } from './entities/report-verification.entity';
import { ReportEvidence } from './entities/report-evidence.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ReportStatus } from '../shared/enums/report-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportTag)
    private readonly reportTagRepository: Repository<ReportTag>,
    @InjectRepository(ReportVerification)
    private readonly reportVerificationRepository: Repository<ReportVerification>,
    @InjectRepository(ReportEvidence)
    private readonly reportEvidenceRepository: Repository<ReportEvidence>,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  async create(
    createDto: CreateReportDto,
    reporterId: string,
  ): Promise<Report> {
    const { tagIds, ...reportData } = createDto;
    const report = this.reportRepository.create({
      ...reportData,
      reporterId,
      reason: reportData.reason || reportData.category || 'Other',
    });

    const duplicates = await this.findPotentialDuplicates(reportData);
    if (duplicates.length > 0) {
      const primaryDuplicate = duplicates[0];
      report.isDuplicate = true;
      report.duplicateOfId = primaryDuplicate.id;
      report.status = ReportStatus.NEEDS_COMMUNITY_REVIEW;
    }

    if (tagIds && tagIds.length > 0) {
      const tags = await this.reportTagRepository.findBy({
        id: In(tagIds),
      });
      report.tags = tags;
    }

    const savedReport = await this.reportRepository.save(report);
    await this.auditLogsService.createLog({
      userId: reporterId,
      action: 'created',
      entityType: 'Report',
      entityId: savedReport.id,
      metadata: { status: savedReport.status, duplicateOfId: savedReport.duplicateOfId },
    });

    return savedReport;
  }

  async findAll(query: any): Promise<any> {
    const { status, tagId, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.tags', 'tags')