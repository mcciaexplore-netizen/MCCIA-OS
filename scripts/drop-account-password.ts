/**
 * Drop the dead credential password column (passwordless migration).
 *
 *   npm run db:drop-password    # reads DATABASE_URL from .env.local
 *
 * Idempotent (`drop column if exists`) and non-destructive to users — it only
 * removes neon_auth.account.password. See the matching .sql in scripts/migrations.
 */

import { neon } from '@neondatabase/serverless';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Put it in .env.local (see .env.example).');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`alter table neon_auth.account drop column if exists password`;
  console.log('✓ Dropped neon_auth.account.password (if it existed). No users were modified.');
}

main().catch((error) => {
  console.error('drop-password failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
