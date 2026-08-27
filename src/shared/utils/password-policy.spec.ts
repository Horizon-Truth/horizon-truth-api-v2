import { checkPasswordStrength } from './password-policy.util';

const ctx = {
  email: 'sarah.tech@example.com',
  username: 'sarahtech',
  fullName: 'Sarah Tech',
};

describe('checkPasswordStrength', () => {
  it('accepts a genuinely random passphrase', () => {
    expect(
      checkPasswordStrength('Giraffe#Tango-42!Lapis', ctx),
    ).toEqual([]);
  });

  it('rejects periodic-passing guessable passwords like Password@123', () => {
    // Passes all character-composition rules (8+, upper, lower, digit,
    // special) but must be rejected as guessable.
    expect(checkPasswordStrength('Password@123')).not.toEqual([]);
    expect(checkPasswordStrength('Password@123', ctx)).not.toEqual([]);
  });

  it('catches leetspeak variants of common words', () => {
    expect(checkPasswordStrength('P@ssw0rd!2024')).not.toEqual([]);
    expect(checkPasswordStrength('Welcome1!')).not.toEqual([]);
  });

  it('rejects sequential runs such as 123, abc and xyz', () => {
    expect(checkPasswordStrength('Sphinx@12345')).not.toEqual([]);
    expect(checkPasswordStrength('Alpha#abcXy1')).not.toEqual([]);
    expect(checkPasswordStrength('Zulu$zyxw9!')).not.toEqual([]);
  });

  it('rejects keyboard-row patterns', () => {
    expect(checkPasswordStrength('Qwerty#123!')).not.toEqual([]);
    expect(checkPasswordStrength('Asdf$1984!!')).not.toEqual([]);
  });

  it('rejects repeated runs of the same character', () => {
    expect(checkPasswordStrength('WaTer$$$$PoRt')).not.toEqual([]);
    expect(checkPasswordStrength('Queen&&&&1')).not.toEqual([]);
  });

  it('rejects passwords built from the user email or username', () => {
    expect(checkPasswordStrength('sarahtech#2026!', ctx)).not.toEqual([]);
    expect(checkPasswordStrength('SarahTech$44', ctx)).not.toEqual([]);
  });

  it('rejects passwords containing the full name', () => {
    expect(checkPasswordStrength('sarahtech!Qux1', ctx)).not.toEqual([]);
  });

  it('does not report a contextual match for unrelated tokens', () => {
    // "alex" is short (below the minimum hint length) and unrelated.
    expect(checkPasswordStrength('Alex#Quark-77%', ctx)).toEqual([]);
  });

  it('directional hints are tokenised correctly', () => {
    // "sarah" reversed is embedded; still caught.
    expect(checkPasswordStrength('haras!Quin123', ctx)).not.toEqual([]);
  });
});