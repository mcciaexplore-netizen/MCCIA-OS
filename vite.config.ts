import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Dev-only middleware that mounts the Sheets proxy at `/api/sheets`, so local
 * development behaves exactly like production without a separate server. The
 * service-account key is read from server-only env vars and never reaches the
 * client bundle. The handler is imported lazily so it (and google-auth-library)
 * stay out of the client build entirely.
 */
function sheetsApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'sheets-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/sheets', (req, res) => {
        void (async () => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const raw = Buffer.concat(chunks).toString('utf8') || '{}';

            const { handleSheetsRequest } = await import('./server/sheets-handler');
            const result = await handleSheetsRequest(JSON.parse(raw), {
              serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '',
              sheetsId: env.SHEETS_ID ?? '',
            });

            res.statusCode = result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.body));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : 'Server error',
              })
            );
          }
        })();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (empty prefix) so server-only secrets are available to
  // the dev middleware. These are NOT injected into the client bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), sheetsApiDevPlugin(env)],
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
