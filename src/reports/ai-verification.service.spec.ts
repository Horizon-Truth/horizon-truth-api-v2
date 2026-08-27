import { NotFoundException } from '@nestjs/common';
import { AiVerificationService } from './ai-verification.service';
import { AiVerificationError } from './ai-verification.client';
import { AiVerificationStatus } from '../shared/enums/ai-verification-status.enum';

/** Lets the detached `setImmediate` runner finish before assertions. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('AiVerificationService', () => {
  let service: AiVerificationService;
  let verificationRepository: any;
  let reportRepository: any;
  let client: any;
  let stored: any[];

  const report = {
    id: 'report-1',
    title: 'Viral Facebook Post Claims Vaccines Cause Autism',
    description: 'The post links to a retracted study.',
  };

  const detectionResult = {
    claim: 'Vaccines Cause Autism',
    verdict: 'FALSE',
    confidence: 'High',
    reasoning: 'No credible link has been found.',
    evidenceSummary: 'Vaccines do not cause autism.',
    sources: [{ title: 'AAP', url: 'https://aap.org/a', score: 0.74 }],
  };

  beforeEach(() => {
    stored = [];

    verificationRepository = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (entity: any) => {
        const saved = {
          id: entity.id ?? `attempt-${stored.length + 1}`,
          ...entity,
        };
        const index = stored.findIndex((item) => item.id === saved.id);
        if (index >= 0) stored[index] = saved;
        else
          stored.push({
            ...saved,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        return saved;
      }),
      findOne: jest.fn(async ({ where }: any) => {
        if (where.id)
          return stored.find((item) => item.id === where.id) ?? null;
        const matches = stored.filter(
          (item) => item.reportId === where.reportId,
        );
        return matches.at(-1) ?? null;
      }),
      find: jest.fn(async ({ where }: any) =>
        stored.filter((item) => item.reportId === where.reportId).reverse(),
      ),
    };

    reportRepository = {
      findOne: jest.fn(async ({ where }: any) =>
        where.id === report.id ? report : null,
      ),
    };

    client = {
      provider: 'ai.horizontruth.org',
      detect: jest.fn().mockResolvedValue(detectionResult),
    };

    service = new AiVerificationService(
      verificationRepository,
      reportRepository,
      client,
    );
  });

  describe('scheduleForReport', () => {
    it('records a PENDING attempt carrying the derived claim', async () => {
      const attempt = await service.scheduleForReport(report as any);

      expect(attempt).toMatchObject({
        reportId: 'report-1',
        status: AiVerificationStatus.PENDING,
        claim: 'Vaccines Cause Autism',
        provider: 'ai.horizontruth.org',
      });
      await flush();
    });

    it('completes the attempt in the background', async () => {
      const attempt = await service.scheduleForReport(report as any);
      await flush();
      await flush();

      const finished = stored.find((item) => item.id === attempt!.id);
      expect(client.detect).toHaveBeenCalledWith('Vaccines Cause Autism');
      expect(finished).toMatchObject({
        status: AiVerificationStatus.COMPLETED,
        verdict: 'FALSE',
        confidence: 'High',
        evidenceSummary: 'Vaccines do not cause autism.',
      });
    });

    it('never throws when the attempt cannot even be recorded', async () => {
      verificationRepository.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.scheduleForReport(report as any),
      ).resolves.toBeNull();
    });
  });

  describe('processAttempt', () => {
    it('marks the attempt FAILED with a user-safe message when the AI errors', async () => {
      client.detect.mockRejectedValue(
        new AiVerificationError(
          'TIMEOUT',
          'The AI verification service took too long to respond.',
        ),
      );

      const attempt = await service.scheduleForReport(report as any);
      await flush();
      await flush();

      const finished = stored.find((item) => item.id === attempt!.id);
      expect(finished).toMatchObject({
        status: AiVerificationStatus.FAILED,
        errorMessage: 'The AI verification service took too long to respond.',
      });
      expect(finished.verdict).toBeUndefined();
    });

    it('does not leak unexpected error detail into the stored message', async () => {
      client.detect.mockRejectedValue(
        new Error('connect ECONNREFUSED 10.0.0.5:443'),
      );

      const attempt = await service.scheduleForReport(report as any);
      await flush();
      await flush();

      const finished = stored.find((item) => item.id === attempt!.id);
      expect(finished.errorMessage).toBe(
        'AI verification could not be completed.',
      );
    });

    it('skips an attempt that is already being processed', async () => {
      stored.push({
        id: 'attempt-x',
        reportId: 'report-1',
        claim: 'Claim',
        status: AiVerificationStatus.PROCESSING,
      });

      await service.processAttempt('attempt-x');

      expect(client.detect).not.toHaveBeenCalled();
    });
  });

  describe('requestVerification', () => {
    it('rejects an unknown report', async () => {
      await expect(
        service.requestVerification('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the stored result without calling the AI again', async () => {
      stored.push({
        id: 'attempt-done',
        reportId: 'report-1',
        claim: 'Vaccines Cause Autism',
        status: AiVerificationStatus.COMPLETED,
        verdict: 'FALSE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.requestVerification('report-1');
      await flush();

      // This is the page-refresh path: it must be free of external calls.
      expect(result.id).toBe('attempt-done');
      expect(client.detect).not.toHaveBeenCalled();
    });

    it('reuses an in-flight attempt instead of starting a second one', async () => {
      stored.push({
        id: 'attempt-running',
        reportId: 'report-1',
        claim: 'Vaccines Cause Autism',
        status: AiVerificationStatus.PROCESSING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.requestVerification('report-1', {
        force: true,
      });
      await flush();

      expect(result.id).toBe('attempt-running');
      expect(client.detect).not.toHaveBeenCalled();
    });

    it('starts a new attempt when re-verification is forced', async () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
      stored.push({
        id: 'attempt-old',
        reportId: 'report-1',
        claim: 'Vaccines Cause Autism',
        status: AiVerificationStatus.FAILED,
        createdAt: oldTimestamp,
        updatedAt: oldTimestamp,
      });

      const result = await service.requestVerification('report-1', {
        force: true,
        requestedById: 'user-9',
      });
      await flush();
      await flush();

      expect(result.id).not.toBe('attempt-old');
      expect(result.requestedById).toBe('user-9');
      expect(client.detect).toHaveBeenCalledTimes(1);
      // History is preserved rather than overwritten.
      expect(stored).toHaveLength(2);
      expect(stored.find((item) => item.id === 'attempt-old').status).toBe(
        AiVerificationStatus.FAILED,
      );
    });

    it('debounces a forced re-run that arrives inside the cooldown', async () => {
      stored.push({
        id: 'attempt-fresh',
        reportId: 'report-1',
        claim: 'Vaccines Cause Autism',
        status: AiVerificationStatus.FAILED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.requestVerification('report-1', {
        force: true,
      });
      await flush();

      expect(result.id).toBe('attempt-fresh');
      expect(client.detect).not.toHaveBeenCalled();
    });

    it('runs a first attempt for a report created before the feature existed', async () => {
      const result = await service.requestVerification('report-1', {
        requestedById: 'user-2',
      });
      await flush();
      await flush();

      expect(result.status).toBeDefined();
      expect(client.detect).toHaveBeenCalledWith('Vaccines Cause Autism');
      expect(stored.at(-1)).toMatchObject({
        status: AiVerificationStatus.COMPLETED,
      });
    });
  });

  describe('reads', () => {
    it('returns null when a report was never analysed', async () => {
      await expect(service.findLatestForReport('report-1')).resolves.toBeNull();
    });

    it('lists every attempt for moderators', async () => {
      stored.push(
        { id: 'a1', reportId: 'report-1', status: AiVerificationStatus.FAILED },
        {
          id: 'a2',
          reportId: 'report-1',
          status: AiVerificationStatus.COMPLETED,
        },
      );

      const history = await service.findHistoryForReport('report-1');

      expect(history.map((item) => item.id)).toEqual(['a2', 'a1']);
    });
  });
});
