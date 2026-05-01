import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('hunter2!');
    expect(hash).toMatch(/^\$argon2/);
    expect(await verifyPassword(hash, 'hunter2!')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });

  it('rejects passwords shorter than 8 chars', async () => {
    await expect(hashPassword('short')).rejects.toThrow(/too short/);
  });

  it('verifyPassword returns false for malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });
});
