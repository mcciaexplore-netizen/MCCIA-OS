import { Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Spinner } from '@/components/ui/Spinner';
import { CommandProvider } from '@/components/command/CommandProvider';
import { CommandPalette } from '@/components/command/CommandPalette';
import { GlobalShortcuts } from '@/components/command/GlobalShortcuts';

/** Centered spinner shown while a lazily-loaded page chunk resolves. */
function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-brand-500" />
    </div>
  );
}

/**
 * App shell: sidebar (desktop) + top bar + scrollable content + bottom tab bar
 * (mobile). Route content is captured via `useOutlet` and animated on change
 * with a fade + slide-up, lazily loaded behind Suspense, and isolated in a
 * per-route error boundary so one page crashing never takes down the shell.
 */
export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <CommandProvider>
      <div className="flex min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mx-auto w-full max-w-6xl">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <ErrorBoundary>
                    <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>

      <CommandPalette />
      <GlobalShortcuts />
    </CommandProvider>
  );
}
