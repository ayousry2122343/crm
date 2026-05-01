import { normalizeEmail, normalizePhone, computeFullName } from './normalize.util';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
  it('returns null for empty/null', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe('normalizePhone', () => {
  it('strips spaces, dashes, parens', () => {
    expect(normalizePhone('+20 (10) 1234-5678')).toBe('+201012345678');
  });
  it('keeps + prefix', () => {
    expect(normalizePhone('+201012345678')).toBe('+201012345678');
  });
  it('returns null for empty', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe('computeFullName', () => {
  it('joins first + last with space', () => {
    expect(computeFullName({ firstName: 'Ahmed', lastName: 'Yousry' })).toBe('Ahmed Yousry');
  });
  it('uses companyName when isCompany=true', () => {
    expect(computeFullName({ isCompany: true, companyName: 'Acme Inc' })).toBe('Acme Inc');
  });
  it('falls back to email when no name', () => {
    expect(computeFullName({ email: 'foo@bar.com' })).toBe('foo@bar.com');
  });
  it('falls back to "(no name)" as last resort', () => {
    expect(computeFullName({})).toBe('(no name)');
  });
});
