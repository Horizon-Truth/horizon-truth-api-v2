/**
 * Turns a crowdsourced report into the single claim we ask the AI to assess.
 *
 * Reports are written as reports ("Viral Facebook post claims vaccines cause
 * autism", "Please check this, my uncle shared it") — sending that verbatim asks
 * the AI to fact-check the reporting rather than the misinformation. These
 * helpers strip the reporting frame and keep the assertion underneath.
 */

/** Upper bound on what we send upstream; long inputs degrade the AI result. */
export const MAX_CLAIM_LENGTH = 500;

/** "Report: ...", "URGENT - ..." and similar labels reporters prepend. */
const LABEL_PREFIX =
  /^\s*(?:urgent|breaking|alert|report|claim|misinformation|disinformation|fake\s*news|false\s*info(?:rmation)?|possible|suspected|viral)\s*[:\-–—]\s*/i;

/** The verb that separates who is claiming from what is being claimed. */
const CLAIM_VERB =
  /\b(?:claims?|claiming|alleges?|alleging|asserts?|asserting|states?|stating|says?|saying|suggests?|suggesting|insists?|insisting|spreading|pushing)\b\s*(?:that\s+)?(?:the\s+idea\s+that\s+)?/i;

/**
 * Noun-form attribution ("rumours about X", "allegations that X"), which frames
 * a claim the same way the verb forms above do.
 */
const NOUN_ATTRIBUTION =
  /\b(?:rumou?rs?|allegations?|claims?|reports?|theor(?:y|ies)|speculation)\s+(?:that|about|of)\s+/i;

/** Reporter narration rather than the claim itself. */
const META_SENTENCE =
  /^(?:i\b|we\b|my\b|please\b|can\s+(?:you|someone|anyone)|could\s+(?:you|someone)|someone\b|somebody\b|this\s+(?:was|is|has)\b|saw\b|found\b|seen\b|there\s+is\s+a\s+(?:post|video|article)|attached\b|see\s+(?:the\s+)?link)/i;

/** A title that names the content type without stating any claim. */
const EMPTY_TITLE =
  /^(?:suspicious|fake|false|misleading|untrue|dubious|questionable|harmful|unverified)?\s*(?:article|post|video|image|photo|comment|content|claim|link|story|message|news|tweet|reel)s?$/i;

/**
 * Nouns naming the container of a claim rather than the claim itself. A title
 * ending in one of these is a headline-style label ("Viral Health Cure Claim",
 * "Manipulated Crypto News") — reporters write these constantly.
 */
const CONTENT_NOUN =
  /^(?:claims?|news|rumou?rs?|posts?|videos?|images?|photos?|articles?|stor(?:y|ies)|hoax(?:es)?|footage|messages?|allegations?|theor(?:y|ies)|conspirac(?:y|ies)|content|clips?|memes?|screenshots?|threads?|reports?|headlines?|ads?|adverts?|misinformation|disinformation)$/i;

/**
 * Tokens that signal a predicate — i.e. the text actually asserts something.
 * Their presence rescues genuine claims that happen to end in a content noun
 * ("The moon landing was a hoax").
 *
 * Deliberately limited to auxiliaries, copulas and modals: content verbs are
 * ambiguous with their noun forms ("Health Cure Claim" is a label, not an
 * assertion that something cures), and guessing wrong here sends the AI the
 * reporter's headline instead of the misinformation.
 */
const PREDICATE_MARKER =
  /\b(?:is|are|was|were|be|been|being|has|have|had|do|does|did|can|could|will|would|shall|should|may|might|must|isn'?t|aren'?t|wasn'?t|weren'?t|won'?t|can'?t|don'?t|doesn'?t|didn'?t)\b/i;

const URL_PATTERN = /\bhttps?:\/\/\S+/gi;
const WRAPPING_QUOTES = /^["'“”‘’«»\s]+|["'“”‘’«»\s]+$/g;
const QUOTED_SEGMENT = /["“]([^"“”]{12,300})["”]/;

export interface ClaimCandidateInput {
  title?: string | null;
  description?: string | null;
}

/** Strips URLs and collapses whitespace so downstream regexes see clean text. */
function tidy(text: string): string {
  return text.replace(URL_PATTERN, ' ').replace(/\s+/g, ' ').trim();
}

function stripWrappers(text: string): string {
  return text
    .replace(WRAPPING_QUOTES, '')
    .replace(/[\s.,;:]+$/, '')
    .trim();
}

function capitaliseFirst(text: string): string {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

/** Truncates on a word boundary so the AI never receives a clipped word. */
function truncate(text: string, max = MAX_CLAIM_LENGTH): string {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const lastSpace = clipped.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).trim();
}

/**
 * Pulls the assertion out of one piece of text: drops any report label, and
 * when the text attributes a claim to someone, keeps only what was claimed.
 */
export function extractClaimStatement(raw: string | null | undefined): string {
  if (!raw) return '';

  let text = tidy(raw);
  // Reporters often stack labels ("URGENT: Report: ..."), so peel twice.
  text = text.replace(LABEL_PREFIX, '').replace(LABEL_PREFIX, '').trim();

  for (const attribution of [CLAIM_VERB, NOUN_ATTRIBUTION]) {
    const match = attribution.exec(text);
    if (match && match.index > 0) {
      const claimed = text.slice(match.index + match[0].length).trim();
      if (countWords(claimed) >= 2) {
        text = claimed;
      }
    }
  }

  return capitaliseFirst(stripWrappers(text));
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * A headline-style label rather than an assertion: it ends by naming the kind
 * of content and never states a predicate.
 */
function isLabelShaped(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  // Trailing punctuation is already stripped by the time this runs.
  return (
    CONTENT_NOUN.test(words[words.length - 1]) && !PREDICATE_MARKER.test(text)
  );
}

/** Rejects text that names the content but asserts nothing checkable. */
function isSubstantive(claim: string): boolean {
  if (countWords(claim) < 3) return false;
  if (EMPTY_TITLE.test(claim.trim())) return false;
  return !isLabelShaped(claim);
}

/**
 * Best claim available in a free-text description: a quoted passage if the
 * reporter quoted the content, otherwise the first sentence that is not
 * narration about how they came across it.
 */
export function extractClaimFromDescription(
  raw: string | null | undefined,
): string {
  if (!raw) return '';

  const text = tidy(raw);

  const quoted = QUOTED_SEGMENT.exec(text);
  if (quoted) {
    const candidate = extractClaimStatement(quoted[1]);
    if (isSubstantive(candidate)) return candidate;
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (META_SENTENCE.test(sentence)) continue;
    const candidate = extractClaimStatement(sentence);
    if (isSubstantive(candidate)) return candidate;
  }

  // Everything read as narration — fall back to the whole description so the
  // AI still gets something rather than nothing.
  return extractClaimStatement(text);
}

/**
 * Derives the claim to verify, preferring the title (reporters put the claim
 * there) and falling back to the description when the title is just a label.
 *
 * Returns an empty string only when the report carries no usable text at all.
 */
export function deriveVerificationClaim(report: ClaimCandidateInput): string {
  const fromTitle = extractClaimStatement(report.title);
  if (isSubstantive(fromTitle)) return truncate(fromTitle);

  const fromDescription = extractClaimFromDescription(report.description);
  if (isSubstantive(fromDescription)) return truncate(fromDescription);

  // Neither source produced a full claim; send whichever text exists.
  return truncate(
    fromTitle || fromDescription || tidy(report.title ?? '') || '',
  );
}
