import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTag } from '../../reports/entities/report-tag.entity';
import { Report } from '../../reports/entities/report.entity';
import { ReportVerification } from '../../reports/entities/report-verification.entity';
import { Language } from '../../reports/entities/language.entity';
import { User } from '../../users/entities/user.entity';
import { ReportStatus } from '../../shared/enums/report-status.enum';
import { ReportPriorityLevel } from '../../shared/enums/report-priority-level.enum';
import { ReportContentType } from '../../shared/enums/report-content-type.enum';

@Injectable()
export class ReportsSeederService {
  private readonly logger = new Logger(ReportsSeederService.name);

  constructor(
    @InjectRepository(ReportTag)
    private reportTagRepository: Repository<ReportTag>,