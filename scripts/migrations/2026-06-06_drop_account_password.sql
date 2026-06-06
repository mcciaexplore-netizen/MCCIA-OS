-- Passwordless migration (2026-06-06)
--
-- Login is now email-only: a session token is issued on email match, with no
-- password anywhere. Better Auth used to store the credential password hash in
-- neon_auth.account.password — that column is now dead, so drop it.
--
-- This does NOT delete any users. neon_auth."user" (id, email, name, role, …) is
-- left completely intact, so every existing account remains accessible.
--
-- Run with: npm run db:drop-password   (or paste this into the Neon SQL editor)

alter table neon_auth.account drop column if exists password;
