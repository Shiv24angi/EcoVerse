import { normalizeEmail } from '../normalize-email';

describe('normalizeEmail Utility (#378)', () => {
  it('lowercases uppercase and mixed-case email addresses', () => {
    expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
    expect(normalizeEmail('Test.User@Sub.Domain.Org')).toBe(
      'test.user@sub.domain.org'
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    expect(normalizeEmail('\tuser@example.com\n')).toBe('user@example.com');
  });

  it('combines trimming and lowercasing correctly', () => {
    expect(normalizeEmail('   John.Doe@EXAMPLE.com \n')).toBe(
      'john.doe@example.com'
    );
  });

  it('returns empty string for empty string input', () => {
    expect(normalizeEmail('')).toBe('');
  });

  it('safely handles null and undefined inputs without throwing errors', () => {
    expect(normalizeEmail(null as unknown as string)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('safely handles non-string inputs', () => {
    expect(normalizeEmail(12345 as unknown as string)).toBe('');
    expect(normalizeEmail({} as unknown as string)).toBe('');
  });
});
