import {
  AiVerificationClient,
  AiVerificationError,
  normaliseConfidence,
  normaliseDetectionResponse,
  normaliseScore,
  normaliseSources,
  normaliseVerdict,
} from './ai-verification.client';
import { AiVerdict } from '../shared/enums/ai-verdict.enum';

const configService = { get: () => undefined } as any;

const successPayload = {
  claim: 'vaccines cause autism',
  verdict: 'FALSE',
  confidence: 'High',
  reasoning: 'Extensive scientific research has found no credible link.',
  evidence_summary: 'Vaccines do not cause autism.',
  sources: [
    {
      title: 'Fact Checked: Vaccines: Safe and Effective, No Link to Autism',
      url: 'https://www.aap.org/en/news-room/fact-checked/vaccines',
      content: 'Immunizations work by prompting your immune system...',
      score: 0.74004334,
    },
  ],
};

describe('normaliseVerdict', () => {
  it('maps known synonyms onto the styled verdicts', () => {
    expect(normaliseVerdict('fake')).toBe(AiVerdict.FALSE);
    expect(normaliseVerdict('Partially True')).toBe(AiVerdict.MIXED);
    expect(normaliseVerdict('insufficient evidence')).toBe(AiVerdict.UNVERIFIED);
  });

  it('passes unknown verdicts through instead of mislabelling them', () => {
    expect(normaliseVerdict('satire')).toBe('SATIRE');
  });

  it('defaults to UNVERIFIED when the field is missing', () => {
    expect(normaliseVerdict(undefined)).toBe(AiVerdict.UNVERIFIED);
    expect(normaliseVerdict('')).toBe(AiVerdict.UNVERIFIED);
  });
});

describe('normaliseConfidence', () => {
  it('normalises casing and synonyms', () => {
    expect(normaliseConfidence('high')).toBe('High');
    expect(normaliseConfidence('MODERATE')).toBe('Medium');
  });

  it('returns undefined when absent, so nothing renders a fake certainty', () => {
    expect(normaliseConfidence(undefined)).toBeUndefined();
  });
});

describe('normaliseScore', () => {
  it('keeps 0–1 relevance untouched', () => {
    expect(normaliseScore(0.74)).toBeCloseTo(0.74);
  });

  it('converts a percentage into the 0–1 range', () => {
    expect(normaliseScore(74)).toBeCloseTo(0.74);
  });

  it('drops values it cannot interpret rather than guessing', () => {
    expect(normaliseScore('not-a-number')).toBeUndefined();
    expect(normaliseScore(-5)).toBeUndefined();
    expect(normaliseScore(5000)).toBeUndefined();
  });
});

describe('normaliseSources', () => {
  it('drops sources with unsafe or missing URLs', () => {
    const sources = normaliseSources([
      { title: 'Safe', url: 'https://example.com/a' },
      { title: 'Script', url: 'javascript:alert(1)' },
      { title: 'No URL' },
      'not-an-object',
    ]);

    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe('https://example.com/a');
  });

  it('falls back to the hostname when a source has no title', () => {
    const [source] = normaliseSources([{ url: 'https://factcheck.org/story' }]);
    expect(source.title).toBe('factcheck.org');
  });

  it('truncates long excerpts', () => {
    const [source] = normaliseSources([
      { title: 'Long', url: 'https://example.com', content: 'x'.repeat(5000) },
    ]);

    expect(source.content!.length).toBeLessThanOrEqual(1001);
  });

  it('returns an empty list when sources are missing entirely', () => {
    expect(normaliseSources(undefined)).toEqual([]);
    expect(normaliseSources({})).toEqual([]);
  });
});

describe('normaliseDetectionResponse', () => {
  it('maps the documented payload onto the application model', () => {
    const result = normaliseDetectionResponse(successPayload, 'vaccines cause autism');

    expect(result).toEqual(
      expect.objectContaining({
        claim: 'vaccines cause autism',
        verdict: 'FALSE',
        confidence: 'High',
        evidenceSummary: 'Vaccines do not cause autism.',
      }),
    );
    expect(result.sources[0].score).toBeCloseTo(0.74, 2);
  });

  it('tolerates a response missing optional fields', () => {
    const result = normaliseDetectionResponse({ verdict: 'MIXED' }, 'some claim');

    expect(result.verdict).toBe(AiVerdict.MIXED);
    expect(result.confidence).toBeUndefined();
    expect(result.reasoning).toBeUndefined();
    expect(result.sources).toEqual([]);
    expect(result.claim).toBe('some claim');
  });

  it('rejects a payload carrying no assessment at all', () => {
    expect(() => normaliseDetectionResponse({}, 'claim')).toThrow(AiVerificationError);
    expect(() => normaliseDetectionResponse('nope', 'claim')).toThrow(AiVerificationError);
    expect(() => normaliseDetectionResponse(null, 'claim')).toThrow(AiVerificationError);
  });
});

describe('AiVerificationClient.detect', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts the claim and returns the normalised result', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => successPayload,
    });
    global.fetch = fetchMock as any;

    const client = new AiVerificationClient(configService);
    const result = await client.detect('vaccines cause autism');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ai.horizontruth.org/api/detect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ claim: 'vaccines cause autism' }),
      }),
    );
    expect(result.verdict).toBe('FALSE');
  });

  it('reports a timeout as a friendly TIMEOUT failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'TimeoutError' }),
    ) as any;

    const client = new AiVerificationClient(configService);

    await expect(client.detect('claim')).rejects.toMatchObject({ reason: 'TIMEOUT' });
  });

  it('maps a non-2xx response to HTTP_ERROR without leaking the body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ stack: 'internal detail' }),
    }) as any;

    const client = new AiVerificationClient(configService);

    await expect(client.detect('claim')).rejects.toMatchObject({
      reason: 'HTTP_ERROR',
      statusCode: 502,
      message: 'The AI verification service returned an error.',
    });
  });

  it('maps unreachable hosts to NETWORK', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

    const client = new AiVerificationClient(configService);

    await expect(client.detect('claim')).rejects.toMatchObject({ reason: 'NETWORK' });
  });

  it('rejects unparseable JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json');
      },
    }) as any;

    const client = new AiVerificationClient(configService);

    await expect(client.detect('claim')).rejects.toMatchObject({ reason: 'MALFORMED_RESPONSE' });
  });

  it('refuses to call the API without a claim', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const client = new AiVerificationClient(configService);

    await expect(client.detect('   ')).rejects.toMatchObject({ reason: 'INVALID_REQUEST' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honours a configured endpoint override', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => successPayload });
    global.fetch = fetchMock as any;

    const client = new AiVerificationClient({
      get: (key: string) => (key === 'AI_VERIFICATION_URL' ? 'https://ai.example.test/detect' : undefined),
    } as any);

    expect(client.provider).toBe('ai.example.test');
    await client.detect('claim');
    expect(fetchMock).toHaveBeenCalledWith('https://ai.example.test/detect', expect.anything());
  });
});
