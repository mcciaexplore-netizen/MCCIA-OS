/**
 * Create the Neon schema for the data backend (idempotent).
 *
 *   npm run db:setup        # reads DATABASE_URL from .env.local
 *
 * Safe to run repeatedly — it only creates the `records` table/index if missing,
 * and never touches existing rows. Run it once against a fresh database.
 */

import { ensureSchema } from '../server/store';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Put it in .env.local (see .env.example).');
    process.exit(1);
  }

  await ensureSchema();
  console.log('✓ Schema ready: records table (+ owner_id column and indexes).');
}

main().catch((error) => {
  console.error('db:setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
