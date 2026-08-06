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
      .leftJoinAndSelect('report.verifications', 'verifications')
      .leftJoinAndSelect('verifications.user', 'verificationUser');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (tagId) {
      queryBuilder.andWhere('tags.id = :tagId', { tagId });
    }

    if (search) {
      queryBuilder.andWhere(
        'report.title ILIKE :search OR report.description ILIKE :search OR report.sourceUrl ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('report.createdAt', 'DESC')
      .getManyAndCount();

    const processedData = data.map((report) => ({
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
      relations: ['reporter', 'tags', 'verifications', 'verifications.user', 'evidence'],
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async addEvidence(reportId: string, userId: string, evidenceData: AddEvidenceDto): Promise<ReportEvidence> {
    const report = await this.findById(reportId);
    const evidence = this.reportEvidenceRepository.create({
      ...evidenceData,
      reportId,
      authorId: userId,
      authorName: 'User',
    });

    const saved = await this.reportEvidenceRepository.save(evidence);
    const credibilityScore = Math.max(report.credibilityScore, evidenceData.credibilityScore ?? 0);
    await this.reportRepository.update(reportId, { credibilityScore });

    await this.auditLogsService.createLog({
      userId,
      action: 'added_evidence',
      entityType: 'Report',
      entityId: reportId,
      metadata: { evidenceType: evidenceData.evidenceType },
    });

    return saved;
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

    const verifications = await this.reportVerificationRepository.findBy({ reportId });
    const positiveCount = verifications.filter((v) => v.status === 'TRUE' || v.status === 'VERIFIED').length;
    const negativeCount = verifications.filter((v) => v.status === 'FALSE' || v.status === 'FAKE').length;

    if (verifications.length > 0) {
      const credibilityScore = Math.round((positiveCount / (positiveCount + negativeCount || 1)) * 100);
      await this.reportRepository.update(reportId, { credibilityScore });
    }

    await this.auditLogsService.createLog({
      userId,
      action: 'added_verification',
      entityType: 'Report',
      entityId: reportId,
      metadata: { status: verificationData.status },
    });

    return saved;
  }

  async update(id: string, updateDto: any, userId?: string): Promise<Report> {
    const report = await this.findById(id);
    const previousStatus = report.status;
    Object.assign(report, updateDto);
    const updated = await this.reportRepository.save(report);
    await this.auditLogsService.createLog({
      userId,
      action: 'updated',
      entityType: 'Report',
      entityId: id,
      metadata: {
        previousStatus,
        nextStatus: updated.status,
        changes: updateDto,
      },
    });
    return updated;
  }

  async remove(id: string): Promise<void> {
    const report = await this.findById(id);
    await this.reportRepository.remove(report);
  }

  private async findPotentialDuplicates(reportData: Partial<Report>): Promise<Report[]> {
    const normalizedTitle = reportData.title?.toLowerCase().trim() || '';
    const normalizedDescription = reportData.description?.toLowerCase().trim() || '';
    const normalizedUrl = reportData.sourceUrl?.toLowerCase().trim() || '';

    const candidates = await this.reportRepository.find({
      where: {
        status: ReportStatus.NEW,
      },
    });

    return candidates.filter((candidate) => {
      const titleMatch = candidate.title?.toLowerCase().includes(normalizedTitle) || normalizedTitle.includes(candidate.title?.toLowerCase() || '');
      const descriptionMatch = candidate.description?.toLowerCase().includes(normalizedDescription) || normalizedDescription.includes(candidate.description?.toLowerCase() || '');
      const urlMatch = normalizedUrl && candidate.sourceUrl?.toLowerCase() === normalizedUrl;
      return titleMatch || descriptionMatch || urlMatch;
    });
  }
}
