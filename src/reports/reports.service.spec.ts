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

    reportRepository.find.mockResolvedValue([existing]);
    reportRepository.create.mockReturnValue({
      title: 'False claim about vaccines',
      description: 'This article repeats a false vaccine claim.',
      sourceUrl: 'https://example.com/fake-news',
      status: ReportStatus.NEW,
      priority: ReportPriorityLevel.MEDIUM,
    });
    reportRepository.save.mockResolvedValue({
      id: 'new-report',
      isDuplicate: true,
      duplicateOfId: existing.id,
    });

    const result = await service.create(
      {
        title: 'False claim about vaccines',
        description: 'This article repeats a false vaccine claim.',
        contentType: 'ARTICLE' as any,
        sourceUrl: 'https://example.com/fake-news',
        language: 'en',
      },
      'user-1',
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOfId).toBe(existing.id);
    expect(auditLogsService.createLog).toHaveBeenCalled();
  });

  it('records an audit entry when a moderator updates report status', async () => {
    const existingReport = {
      id: 'report-1',
      status: ReportStatus.NEW,
      priority: ReportPriorityLevel.MEDIUM,
      title: 'Test report',
      description: 'Details',
      reporterId: 'user-1',
    };

    reportRepository.findOne.mockResolvedValue(existingReport);
    reportRepository.save.mockResolvedValue({
      ...existingReport,
      status: ReportStatus.UNDER_REVIEW,
      moderatorNotes: 'Needs more evidence',
    });

    const result = await service.update(
      'report-1',
      {
        status: ReportStatus.UNDER_REVIEW,
        moderatorNotes: 'Needs more evidence',
      },
      'moderator-1',
    );

    expect(result.status).toBe(ReportStatus.UNDER_REVIEW);
    expect(auditLogsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('updated'),
        entityType: 'Report',
        entityId: 'report-1',
      }),
    );
  });
});
