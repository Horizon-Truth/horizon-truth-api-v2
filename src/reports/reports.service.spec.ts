import { ReportsService } from './reports.service';
import { ReportStatus } from '../shared/enums/report-status.enum';
import { ReportPriorityLevel } from '../shared/enums/report-priority-level.enum';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportRepository: any;
  let reportTagRepository: any;
  let reportVerificationRepository: any;
  let reportEvidenceRepository: any;
  let auditLogsService: any;

  beforeEach(() => {
    reportRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    reportTagRepository = {
      findBy: jest.fn(),
    };
    reportVerificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findBy: jest.fn(),
    };
    reportEvidenceRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    auditLogsService = {
      createLog: jest.fn(),
    };

    service = new ReportsService(
      reportRepository,
      reportTagRepository,
      reportVerificationRepository,
      reportEvidenceRepository,
      auditLogsService,
    );
  });

  it('flags a new report as a duplicate when a similar report already exists', async () => {
    const existing = {
      id: 'existing-report',
      title: 'False claim about vaccines',
      description: 'This article repeats a false vaccine claim.',
      sourceUrl: 'https://example.com/fake-news',
    };
