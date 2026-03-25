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