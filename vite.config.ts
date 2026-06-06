import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleBulk, handlePasswordReset, handleRecords, type ApiRequest } from './server/api';
import { handleAuthNode } from './server/authNode';

// https://vite.dev/config/

/** Read the full request body as a string ('' when empty). */
function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

/**
 * Serve the Neon-backed data API and Better Auth routes during `vite dev`,
 * mirroring the Vercel functions in `/api` so `npm run dev` behaves like the
 * deployed app (same database, same auth).
 */
function neonApiDevPlugin(): PluginOption {
  return {
    name: 'neon-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        const parsed = new URL(url, 'http://localhost');
        const raw = await readRawBody(req);

        // Better Auth owns everything under /api/auth.
        if (parsed.pathname.startsWith('/api/auth')) {
          await handleAuthNode(req, res, raw);
          return;
        }

        const route =
          parsed.pathname === '/api/records'
            ? handleRecords
            : parsed.pathname === '/api/bulk'
              ? handleBulk
              : parsed.pathname === '/api/reset'
                ? handlePasswordReset
                : null;
        if (!route) return next();

        let body: unknown;
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = undefined;
          }
        }

        const apiReq: ApiRequest = {
          method: req.method ?? 'GET',
          query: Object.fromEntries(parsed.searchParams.entries()),
          body,
          headers: { cookie: req.headers.cookie },
        };

        res.setHeader('content-type', 'application/json');
        try {
          const result = await route(apiReq);
          res.statusCode = result.status;
          res.end(JSON.stringify(result.body));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Server error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // The dev middleware runs in Node and needs the server-only secrets. Vite only
  // exposes VITE_* to the client, so lift these into process.env explicitly.
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'] as const) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), neonApiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      open: true,
    },
  };
});
