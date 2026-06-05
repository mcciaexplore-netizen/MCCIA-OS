import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleBulk, handleRecords, type ApiRequest } from './server/api';

// https://vite.dev/config/

/** Collect and JSON-parse a request body (undefined for empty/invalid). */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on('error', () => resolve(undefined));
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Serve the Neon-backed data API during `vite dev`, mirroring the Vercel
 * functions in `/api` so `npm run dev` talks to the same database as production.
 */
function neonApiDevPlugin(): PluginOption {
  return {
    name: 'neon-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        const parsed = new URL(url, 'http://localhost');
        const route =
          parsed.pathname === '/api/records'
            ? handleRecords
            : parsed.pathname === '/api/bulk'
              ? handleBulk
              : null;
        if (!route) return next();

        const apiReq: ApiRequest = {
          method: req.method ?? 'GET',
          query: Object.fromEntries(parsed.searchParams.entries()),
          body: await readBody(req),
          headers: { 'x-app-key': headerValue(req.headers['x-app-key']) },
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
  if (env.DATABASE_URL && !process.env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  if (env.APP_API_KEY && !process.env.APP_API_KEY) process.env.APP_API_KEY = env.APP_API_KEY;

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
