import { useContext, useEffect, useRef } from 'react';
import { CommandContext, type CommandContextValue } from './command-context';

export function useAppCommand(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useAppCommand must be used within a CommandProvider');
  return ctx;
}

/**
 * Register the current page's "new entry" action while it is mounted. The
 * latest `run` is kept in a ref so re-renders don't re-register, and the action
 * is cleared on unmount (route change).
 */
export function useRegisterNewAction(label: string, run: () => void): void {
  const { setNewAction } = useAppCommand();
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    setNewAction({ label, run: () => runRef.current() });
    return () => setNewAction(null);
  }, [label, setNewAction]);
}
