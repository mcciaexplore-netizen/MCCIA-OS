import { createContext } from 'react';

/** A page's context-aware "new entry" action (fired by the N shortcut / palette). */
export interface NewAction {
  label: string;
  run: () => void;
}

export interface CommandContextValue {
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  newAction: NewAction | null;
  setNewAction: (action: NewAction | null) => void;
}

export const CommandContext = createContext<CommandContextValue | null>(null);
