/**
 * Runtime account overrides on top of the seed roster.
 *
 * Settings → Account and the login's "Forgot password" flow let the user change
 * their display name, emoji, password, and recovery code. Since there is no
 * backend, those changes are stored in localStorage and merged over the baked-in
 * defaults from `users.ts`. (Still a client-side gate — see the note there.)
 */

import { APP_USERS, type AppUser } from './users';

const OVERRIDES_KEY = 'mccia:auth:overrides';

type Override = Partial<Pick<AppUser, 'name' | 'emoji' | 'passwordHash' | 'recoveryHash'>>;
type OverrideMap = Record<string, Override>;

function readOverrides(): OverrideMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as OverrideMap) : {};
  } catch {
    return {};
  }
}

function writeOverride(id: string, patch: Override): void {
  const all = readOverrides();
  all[id] = { ...all[id], ...patch };
  window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

/** The roster with any saved overrides applied. */
export function effectiveUsers(): AppUser[] {
  const overrides = readOverrides();
  return APP_USERS.map((user) => ({ ...user, ...overrides[user.id] }));
}

/** A single effective (override-merged) profile by id. */
export function effectiveUserById(id: string): AppUser | undefined {
  return effectiveUsers().find((u) => u.id === id);
}

export function setProfile(id: string, fields: { name?: string; emoji?: string }): void {
  const patch: Override = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.emoji !== undefined) patch.emoji = fields.emoji;
  writeOverride(id, patch);
}

export function setPasswordHash(id: string, passwordHash: string): void {
  writeOverride(id, { passwordHash });
}

export function setRecoveryHash(id: string, recoveryHash: string): void {
  writeOverride(id, { recoveryHash });
}
