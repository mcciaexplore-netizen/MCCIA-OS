// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  effectiveUsers,
  effectiveUserById,
  setProfile,
  setPasswordHash,
  setRecoveryHash,
} from './account';
import { APP_USERS } from './users';

beforeEach(() => {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  });
});

describe('account overrides', () => {
  it('returns the seed roster when there are no overrides', () => {
    const users = effectiveUsers();
    expect(users).toHaveLength(APP_USERS.length);
    expect(users[0].name).toBe('Sujal');
    expect(users[0].emoji).toBe('😎');
  });

  it('applies a name/emoji override without touching other fields', () => {
    setProfile('sujal', { name: 'Gauri', emoji: '🌸' });
    const u = effectiveUserById('sujal');
    expect(u?.name).toBe('Gauri');
    expect(u?.emoji).toBe('🌸');
    expect(u?.role).toBe('MCCIA Pune'); // seed value preserved
    expect(u?.passwordHash).toBe(APP_USERS[0].passwordHash);
  });

  it('overrides password and recovery hashes', () => {
    setPasswordHash('sujal', 'newpwhash');
    setRecoveryHash('sujal', 'newrechash');
    const u = effectiveUserById('sujal');
    expect(u?.passwordHash).toBe('newpwhash');
    expect(u?.recoveryHash).toBe('newrechash');
  });

  it('merges successive overrides instead of clobbering', () => {
    setProfile('sujal', { name: 'X' });
    setPasswordHash('sujal', 'h');
    const u = effectiveUserById('sujal');
    expect(u?.name).toBe('X');
    expect(u?.passwordHash).toBe('h');
    expect(u?.emoji).toBe('😎'); // untouched
  });
});
