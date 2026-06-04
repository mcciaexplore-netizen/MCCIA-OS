import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and re-render when it changes.
 * SSR-safe: defaults to `false` until mounted on the client.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Convenience: true on desktop-sized viewports (Tailwind `lg` breakpoint). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
