import { describe, it, expect } from 'vitest';
import { sha256Hex, verifyPassword } from './hash';
import { findUserById } from './users';

describe('sha256Hex', () => {
  it('produces the known SHA-256 of the default password', async () => {
    expect(await sha256Hex('mccia2026')).toBe(
      '1c1549e818b3e37eee062904de95c65db4f9e2e06d6fad3dbefbb426478f53d6'
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
    expect(await verifyPassword(user!, 'mccia2026')).toBe(true);
    expect(await verifyPassword(user!, 'wrong')).toBe(false);
    expect(await verifyPassword(user!, '')).toBe(false);
  });
});
