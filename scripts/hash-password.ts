/**
 * Generate the SHA-256 hash for a login password.
 *
 *   npx tsx scripts/hash-password.ts "your-password"
 *
 * Copy the printed hash into `passwordHash` for the relevant profile in
 * src/auth/users.ts. (Matches the browser's Web Crypto SHA-256, so the login
 * check will accept the password.)
 */

import { createHash } from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts "your-password"');
  process.exit(1);
}

const hash = createHash('sha256').update(password).digest('hex');
console.log(hash);
