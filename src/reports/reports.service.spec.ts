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
  let aiVerificationService: any;

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
    aiVerificationService = {
      scheduleForReport: jest.fn().mockResolvedValue(null),
      findLatestForReport: jest.fn().mockResolvedValue(null),
    };

    service = new ReportsService(
      reportRepository,
      reportTagRepository,
      reportVerificationRepository,
      reportEvidenceRepository,
      auditLogsService,
      aiVerificationService,
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

  it('schedules AI verification once a report is saved', async () => {
    reportRepository.find.mockResolvedValue([]);
    reportRepository.create.mockReturnValue({ title: 'Vaccines cause autism' });
    reportRepository.save.mockResolvedValue({
      id: 'new-report',
      title: 'Vaccines cause autism',
    });

    await service.create(
      {
        title: 'Vaccines cause autism',
        description: 'A viral post repeats this claim.',
        contentType: 'POST' as any,
        language: 'en',
      },
      'user-1',
    );

    expect(aiVerificationService.scheduleForReport).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-report' }),
    );
  });

  it('still creates the report when AI verification cannot be scheduled', async () => {
    reportRepository.find.mockResolvedValue([]);
    reportRepository.create.mockReturnValue({ title: 'Vaccines cause autism' });
    reportRepository.save.mockResolvedValue({ id: 'new-report' });
    aiVerificationService.scheduleForReport.mockRejectedValue(
      new Error('AI service down'),
    );

    // The community reporting flow must survive an unavailable AI service.
    await expect(
      service.create(
        {
          title: 'Vaccines cause autism',
          description: 'A viral post repeats this claim.',
          contentType: 'POST' as any,
          language: 'en',
        },
        'user-1',
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'new-report' }));
  });

  it('attaches the latest AI verification to a report detail lookup', async () => {
    reportRepository.findOne.mockResolvedValue({
      id: 'report-1',
      title: 'Report',
    });
    aiVerificationService.findLatestForReport.mockResolvedValue({
      id: 'attempt-1',
      status: 'COMPLETED',
      verdict: 'FALSE',
    });

    const result = await service.findById('report-1');

    expect(result.aiVerification).toEqual(
      expect.objectContaining({ id: 'attempt-1', verdict: 'FALSE' }),
    );
  });

  it('serves a report with no AI verification as null rather than failing', async () => {
    // Reports created before the feature existed have no attempt rows.
    reportRepository.findOne.mockResolvedValue({
      id: 'legacy-report',
      title: 'Old report',
    });
    aiVerificationService.findLatestForReport.mockResolvedValue(null);

    const result = await service.findById('legacy-report');

    expect(result.aiVerification).toBeNull();
    expect(result.id).toBe('legacy-report');
  });

  describe('public visibility and user fields', () => {
    const fullUser = {
      id: 'user-1',
      fullName: 'Reporter Person',
      username: 'reporter',
      role: 'PLAYER',
      email: 'reporter@example.com',
      phone: '+251900000000',
      apiKey: 'secret-api-key',
    };

    it('never returns private reporter or verifier fields from a detail lookup', async () => {
      reportRepository.findOne.mockResolvedValue({
        id: 'report-1',
        status: ReportStatus.NEW,
        reporter: { ...fullUser },
        verifications: [{ id: 'v1', user: { ...fullUser } }],
      });

      const result: any = await service.findById('report-1', {
        includeHidden: false,
      });

      for (const user of [result.reporter, result.verifications[0].user]) {
        expect(user).toEqual({
          id: 'user-1',
          fullName: 'Reporter Person',
          username: 'reporter',
          role: 'PLAYER',
        });
      }
      expect(JSON.stringify(result)).not.toMatch(
        /secret-api-key|@example\.com/,
      );
    });

    it.each([
      ReportStatus.REJECTED,
      ReportStatus.ARCHIVED,
      ReportStatus.DUPLICATE,
    ])(
      'hides a %s report from the public but not from staff',
      async (status) => {
        reportRepository.findOne.mockResolvedValue({ id: 'report-1', status });

        await expect(
          service.findById('report-1', { includeHidden: false }),
        ).rejects.toThrow('Report not found');
        await expect(
          service.findById('report-1', { includeHidden: true }),
        ).resolves.toEqual(expect.objectContaining({ id: 'report-1' }));
      },
    );

    const listQueryBuilder = () => {
      const qb: any = {};
      for (const method of [
        'leftJoin',
        'leftJoinAndSelect',
        'addSelect',
        'andWhere',
        'skip',
        'take',
        'orderBy',
      ]) {
        qb[method] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      reportRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('filters hidden statuses out of the public list and selects only public user columns', async () => {
      const qb = listQueryBuilder();

      await service.findAll({ limit: '500' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'report.status NOT IN (:...hiddenStatuses)',
        expect.anything(),
      );
      expect(qb.addSelect).toHaveBeenCalledWith([
        'reporter.id',
        'reporter.fullName',
        'reporter.username',
        'reporter.role',
      ]);
      expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith(
        'report.reporter',
        expect.anything(),
      );
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('lists every status for staff', async () => {
      const qb = listQueryBuilder();

      await service.findAll({}, { includeHidden: true });

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'report.status NOT IN (:...hiddenStatuses)',
        expect.anything(),
      );
    });
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
