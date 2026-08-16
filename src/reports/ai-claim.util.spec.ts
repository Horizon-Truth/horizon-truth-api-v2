import {
  MAX_CLAIM_LENGTH,
  deriveVerificationClaim,
  extractClaimFromDescription,
  extractClaimStatement,
} from './ai-claim.util';

describe('extractClaimStatement', () => {
  it('drops the attribution and keeps what was claimed', () => {
    expect(extractClaimStatement('Viral Facebook Post Claims Vaccines Cause Autism')).toBe(
      'Vaccines Cause Autism',
    );
  });

  it('handles other attribution verbs', () => {
    expect(extractClaimStatement('A TikTok video alleges that 5G towers spread the virus')).toBe(
      '5G towers spread the virus',
    );
  });

  it('strips reporter labels', () => {
    expect(extractClaimStatement('URGENT: Drinking bleach cures the flu')).toBe(
      'Drinking bleach cures the flu',
    );
  });

  it('removes URLs and wrapping quotes', () => {
    expect(
      extractClaimStatement('"The election was rigged" https://example.com/post'),
    ).toBe('The election was rigged');
  });

  it('returns an empty string for empty input', () => {
    expect(extractClaimStatement(undefined)).toBe('');
    expect(extractClaimStatement('   ')).toBe('');
  });

  it('keeps a bare claim untouched apart from casing', () => {
    expect(extractClaimStatement('vaccines cause autism')).toBe('Vaccines cause autism');
  });
});

describe('extractClaimFromDescription', () => {
  it('prefers a quoted passage over reporter narration', () => {
    const description =
      'I saw this on Facebook yesterday. The post said "the moon landing was filmed in a studio" and it is spreading fast.';

    expect(extractClaimFromDescription(description)).toBe(
      'The moon landing was filmed in a studio',
    );
  });

  it('skips narration sentences and uses the first real assertion', () => {
    const description =
      'My uncle shared this with me. Please check it. Drinking hot water flushes out the coronavirus.';

    expect(extractClaimFromDescription(description)).toBe(
      'Drinking hot water flushes out the coronavirus',
    );
  });

  it('falls back to the whole description when everything reads as narration', () => {
    expect(extractClaimFromDescription('I saw something odd here.')).toBe('I saw something odd here');
  });
});

describe('deriveVerificationClaim', () => {
  it('verifies the claim, not the report title framing', () => {
    const claim = deriveVerificationClaim({
      title: 'Viral Facebook Post Claims Vaccines Cause Autism',
      description: 'This post has been shared 40,000 times and links to a retracted study.',
    });

    expect(claim).toBe('Vaccines Cause Autism');
  });

  // Headline-style noun-phrase titles are the common shape in real reports.
  it('falls back to the description for a headline-style label title', () => {
    const claim = deriveVerificationClaim({
      title: 'Viral Health Cure Claim',
      description:
        'A popular social media post claiming a miracle cure for respiratory illnesses without medical evidence.',
    });

    expect(claim).toBe('A miracle cure for respiratory illnesses without medical evidence');
  });

  it('handles a label title ending in "News"', () => {
    const claim = deriveVerificationClaim({
      title: 'Manipulated Crypto News',
      description: 'Deepfake video of a CEO promoting a fraudulent investment scheme.',
    });

    expect(claim).toBe('Deepfake video of a CEO promoting a fraudulent investment scheme');
  });

  it('strips noun-form attribution such as "rumors about"', () => {
    const claim = deriveVerificationClaim({
      title: 'Unverified Local Election Rumor',
      description:
        'WhatsApp message circulating rumors about polling station changes in District B.',
    });

    expect(claim).toBe('Polling station changes in District B');
  });

  it('keeps a real claim that happens to end in a content noun', () => {
    // "was" marks a predicate, so this is an assertion, not a label.
    const claim = deriveVerificationClaim({
      title: 'The moon landing was a hoax',
      description: 'Shared widely on social media.',
    });

    expect(claim).toBe('The moon landing was a hoax');
  });

  it('falls back to the description when the title is only a label', () => {
    const claim = deriveVerificationClaim({
      title: 'Suspicious Article',
      description: 'The article states that garlic cures COVID-19.',
    });

    expect(claim).toBe('Garlic cures COVID-19');
  });

  it('ignores irrelevant reporting chatter in the description', () => {
    const claim = deriveVerificationClaim({
      title: 'Misleading post',
      description:
        'I found this while scrolling. Please review it quickly. The 2020 election was stolen through voting machines. Thanks for looking into this.',
    });

    expect(claim).toBe('The 2020 election was stolen through voting machines');
  });

  it('truncates very long claims on a word boundary', () => {
    const long = `${'Widespread misinformation about public health '.repeat(40)}spreads online`;
    const claim = deriveVerificationClaim({ title: long, description: '' });

    expect(claim.length).toBeLessThanOrEqual(MAX_CLAIM_LENGTH);
    expect(claim.endsWith(' ')).toBe(false);
  });

  it('returns an empty string when a report carries no usable text', () => {
    expect(deriveVerificationClaim({ title: '', description: '' })).toBe('');
  });
});
