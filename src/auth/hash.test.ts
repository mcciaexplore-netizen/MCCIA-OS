import { describe, it, expect } from 'vitest';
import { sha256Hex, verifyPassword } from './hash';
import { findUserById } from './users';

describe('sha256Hex', () => {
  it('produces the known SHA-256 of the default password', async () => {
    expect(await sha256Hex('mccia26')).toBe(
      '1ad6be2ee26346ca6748ae49755dd9ff4c9cf850aa87bf82693a7cc889c7bc85'
    );
  });

  it('is deterministic and sensitive to input', async () => {
    expect(await sha256Hex('abc')).toBe(await sha256Hex('abc'));
    expect(await sha256Hex('abc')).not.toBe(await sha256Hex('abd'));
  });
});

describe('verifyPassword', () => {
  it('accepts the correct password and rejects others', async () => {
    const user = findUserById('sujal');
    expect(user).toBeDefined();
    expect(await verifyPassword(user!, 'mccia26')).toBe(true);
    expect(await verifyPassword(user!, 'wrong')).toBe(false);
    expect(await verifyPassword(user!, '')).toBe(false);
  });
});
