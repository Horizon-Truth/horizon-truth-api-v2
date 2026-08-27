import { BadRequestException } from '@nestjs/common';

/**
 * Guesses that survive the character-composition rules (length 8+, upper/lower,
 * digit, special) but are still trivially guessable (e.g. `Password@123`,
 * `Welcome1!`, `Qwerty2024#`) are rejected here.
 */

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '+': 't',
};

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Full leet-aware normalisation used for word and contextual matching:
 * `P@ssw0rd!` and `Password@123` both reduce to a form containing `password`.
 * It is intentionally aggressive, so sequence and keyboard tests use the
 * digit-preserving `naked` form instead (so `123` is not destroyed here).
 */
function normalize(password: string): string {
  return [...password.toLowerCase()]
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

/** Lower-cases and strips symbols but keeps digits intact, for look/sequence tests. */
function naked(password: string): string {
  return password.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Common words that, alone or with a numeric/symbol suffix, are among the
 * first things an attacker tries. Shorter words are only matched exactly to
 * avoid rejecting otherwise-fine passwords that merely contain the word.
 */
const COMMON_WORDS = new Set([
  'password',
  'passw0rd',
  'qwerty',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'shadow',
  'superman',
  'batman',
  'iloveyou',
  'trustno1',
  'hello',
  'master',
  'freedom',
  'whatever',
  'secret',
  'summer',
  'winter',
  'christmas',
  'holiday',
  'charlie',
  'jessica',
  'jennifer',
  'daniel',
  'michael',
  'starwars',
  'computer',
  'america',
  'chicago',
  'thomas',
  'george',
  'school',
  'college',
  'teacher',
  'elephant',
  'mustang',
  'corvette',
  'gandalf',
  'dumbledore',
  'hunter',
  'ginger',
  'pepper',
  'coffee',
  'anthony',
  'justin',
  'matthew',
  'server',
  'service',
  'junior',
  'alexis',
  'bailey',
  'andrew',
  'nathan',
  'robert',
  'charles',
  'phoenix',
  'friends',
  'family',
  'ethiopia',
  'addis',
  'horizon',
  'truth',
]);

/** Shorter values matched only when the whole password is that value. */
const EXACT_COMMON = new Set(['test', 'love', 'isis', 'admin', 'guest']);

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function findSequence(password: string): string | null {
  const seq = naked(password);
  for (let i = 0; i + 2 < seq.length; i++) {
    const a = ALPHABET.indexOf(seq[i]);
    const b = ALPHABET.indexOf(seq[i + 1]);
    const c = ALPHABET.indexOf(seq[i + 2]);
    if (a === -1 || b === -1 || c === -1) continue;
    if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) {
      return seq.slice(i, i + 3);
    }
  }
  return null;
}

function findKeyboardPattern(password: string): string | null {
  const seq = naked(password);
  for (const row of KEYBOARD_ROWS) {
    const reversed = [...row].reverse().join('');
    for (let i = 0; i + 3 < row.length; i++) {
      const chunk = row.slice(i, i + 4);
      const reverseChunk = reversed.slice(i, i + 4);
      if (seq.includes(chunk) || seq.includes(reverseChunk)) {
        return chunk;
      }
    }
  }
  return null;
}

export interface PasswordContext {
  email?: string;
  username?: string;
  fullName?: string;
}

function contextualHints(context?: PasswordContext): string[] {
  const hints: string[] = [];
  if (context?.email) {
    const localPart = context.email.split('@')[0];
    if (localPart) {
      hints.push(
        ...localPart
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean),
      );
    }
  }
  if (context?.username) hints.push(context.username);
  if (context?.fullName) {
    hints.push(
      ...context.fullName
        .replace(/[^a-zA-Z ]/g, ' ')
        .split(/\s+/)
        .map((w) => w.toLowerCase()),
    );
  }
  return hints
    .map((h) => h.toLowerCase())
    .filter((h) => h.length >= 4)
    .filter((h, i, arr) => arr.indexOf(h) === i);
}

/**
 * Returns a human-readable list of reasons the password is guessable.
 * An empty array means the password passes the policy.
 */
export function checkPasswordStrength(
  password: string,
  context?: PasswordContext,
): string[] {
  const problems: string[] = [];
  const normalized = normalize(password);

  if (normalized.length < 4) {
    return ['Password must be at least 8 characters long and not look like a date, name or word'];
  }

  if (EXACT_COMMON.has(normalized)) {
    problems.push(
      'This password is too common and easy to guess. Choose something unique.',
    );
    return problems;
  }

  for (const word of COMMON_WORDS) {
    if (normalized.includes(word)) {
      problems.push(
        'This password is too common and easy to guess (like Password123 or Welcome1). Choose something unique.',
      );
      break;
    }
  }
  if (problems.length) return problems;

  const sequence = findSequence(password);
  if (sequence) {
    problems.push(
      `This password contains an easy-to-guess sequence (${sequence}). Avoid consecutive numbers or letters like 123 or abc.`,
    );
    return problems;
  }

  const keyboard = findKeyboardPattern(password);
  if (keyboard) {
    problems.push(
      `This password contains an easy-to-guess keyboard pattern (${keyboard}). Avoid patterns like qwerty or asdf.`,
    );
    return problems;
  }

  if (/(.)\1{3,}/.test(password)) {
    problems.push(
      'This password contains repeated characters (like aaaa). Avoid repeating the same character.',
    );
    return problems;
  }

  for (const hint of contextualHints(context)) {
    if (normalized.includes(hint) || normalized.includes([...hint].reverse().join(''))) {
      problems.push(
        'This password is too similar to your name, email, or username. Choose something unrelated.',
      );
      break;
    }
  }

  return problems;
}

/** Throws a BadRequestException describing the first violation, if any. */
export function assertStrongPassword(
  password: string,
  context?: PasswordContext,
): void {
  const problems = checkPasswordStrength(password, context);
  if (problems.length > 0) {
    throw new BadRequestException(problems[0]);
  }
}