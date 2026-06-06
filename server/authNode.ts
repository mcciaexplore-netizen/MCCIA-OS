/**
 * Bridge Better Auth's web-standard handler (`auth.handler(Request)`) to Node's
 * req/res, so the same code serves the `/api/auth/*` routes under both the Vercel
 * Node runtime and the Vite dev middleware.
 *
 * Callers pass the already-read raw body when they have it (the Vite middleware),
 * or leave it undefined to reconstruct it from a parsed body (Vercel populates
 * `req.body`). Better Auth's client always sends JSON, so re-stringifying a
 * parsed object reproduces the request faithfully.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAuth } from './auth.js';

interface NodeReqLike extends IncomingMessage {
  body?: unknown;
}

function toWebHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.set(key, value);
  }
  return headers;
}

function resolveBody(req: NodeReqLike, rawBody: string | undefined): string | undefined {
  const method = req.method ?? 'GET';
  if (method === 'GET' || method === 'HEAD') return undefined;
  if (rawBody !== undefined) return rawBody || undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return JSON.stringify(req.body);
}

export async function handleAuthNode(
  req: NodeReqLike,
  res: ServerResponse,
  rawBody?: string
): Promise<void> {
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const url = new URL(req.url ?? '/', `${proto}://${host}`);

  const request = new Request(url, {
    method: req.method ?? 'GET',
    headers: toWebHeaders(req),
    body: resolveBody(req, rawBody),
  });

  const response = await getAuth().handler(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return; // handled below (may be multiple)
    res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) res.setHeader('set-cookie', cookies);

  res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
}
