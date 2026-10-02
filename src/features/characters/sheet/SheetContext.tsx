import { createContext, useContext } from 'react';
import type { Campaign, Character } from '../../../db/types';

export interface SheetContextValue {
  c: Character;
  campaign: Campaign;
  /** true = modo edición (inputs); false = modo juego (clic para tirar). */
  edit: boolean;
  update: (change: (c: Character) => Character) => void;
  /** Tirada de d20 + bonificador a nombre del personaje. */
  check: (label: string, bonus: number) => void;
  /** Tirada libre ("2d6+3") a nombre del personaje. */
  rollExpr: (label: string, expression: string) => void;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet fuera de la hoja de personaje');
  return ctx;
}
