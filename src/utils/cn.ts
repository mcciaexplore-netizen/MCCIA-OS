/**
 * Tiny className combiner. Joins truthy strings with a space — no external
 * dependency needed for this scale of app.
 */
export type ClassValue = string | number | null | false | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
