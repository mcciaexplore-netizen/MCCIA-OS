/**
 * Create the Supabase schema for the data backend (idempotent).
 *
 *   npm run db:setup        # reads DATABASE_URL from .env.local
 *
 * Equivalent to running supabase/schema.sql. Safe to run repeatedly — it only
 * creates the `users` / `records` tables + index if missing, and never touches
 * existing rows. To create the user accounts afterwards, run supabase/seed.sql.
 */

import { ensureSchema } from '../server/store';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Put it in .env.local (see .env.example).');
    process.exit(1);
  }

  await ensureSchema();
  console.log('✓ Schema ready: users + records tables (and indexes).');
  console.log('  Next: run supabase/seed.sql to create the user accounts.');
  process.exit(0);
}

main().catch((error) => {
  console.error('db:setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
