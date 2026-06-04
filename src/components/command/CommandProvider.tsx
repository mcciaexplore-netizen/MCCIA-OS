import { useMemo, useState, type ReactNode } from 'react';
import { CommandContext, type CommandContextValue, type NewAction } from './command-context';

/**
 * Holds global command-bar state: whether the Cmd+K palette is open and the
 * current page's registered "new entry" action. Wrap the app shell with this so
 * the TopBar, palette, and keyboard handler can share it.
 */
export function CommandProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newAction, setNewAction] = useState<NewAction | null>(null);

  const value = useMemo<CommandContextValue>(
    () => ({
      paletteOpen,
      openPalette: () => setPaletteOpen(true),
      closePalette: () => setPaletteOpen(false),
      newAction,
      setNewAction,
    }),
    [paletteOpen, newAction]
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}
