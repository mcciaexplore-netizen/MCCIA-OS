/**
 * URL sanitisation for user/imported data rendered into `href`.
 *
 * React escapes text but does NOT block dangerous URL schemes — a stored
 * `javascript:` (or `data:`) link would execute on click. Run any user-supplied
 * URL through `sanitizeUrl` before putting it in an anchor.
 */

const SAFE_SCHEME = /^(https?:|mailto:|tel:)/i;
// A bare domain like "acme.in" or "acme.in/path" — we upgrade these to https.
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(\/.*)?$/i;

/**
 * Returns a safe href, or `null` if the value can't be made safe.
 * - `https://`, `http://`, `mailto:`, `tel:` pass through.
 * - A bare domain is upgraded to `https://`.
 * - `javascript:`, `data:`, `vbscript:`, etc. → `null`.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === '') return null;
  if (SAFE_SCHEME.test(trimmed)) return trimmed;
  if (BARE_DOMAIN.test(trimmed)) return `https://${trimmed}`;
  return null;
}
