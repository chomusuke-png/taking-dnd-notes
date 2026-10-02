import { create } from 'zustand';
import { formatMod } from '../../rules/derive';
import { DiceError, roll, rollD20, type RollMode } from '../../rules/dice';
import { useUi } from '../../store/ui';

export interface RollEntry {
  id: number;
  who: string;
  label: string;
  /** Desglose legible: "d20 (14, 7) +5" */
  detail: string;
  total: number;
  /** d20 natural usado (solo en tiradas de d20). */
  natural?: number;
  crit?: 'success' | 'fail';
  at: number;
}

interface DiceState {
  mode: RollMode;
  setMode: (mode: RollMode) => void;
  log: RollEntry[];
  last?: RollEntry;
  /** Tirada de d20 + bonificador con el modo actual (ventaja / desventaja), que luego vuelve a normal. */
  check: (who: string, label: string, bonus: number) => RollEntry;
  /** Tirada libre: "2d6+3". Devuelve undefined si la expresión es inválida. */
  expr: (who: string, label: string, expression: string) => RollEntry | undefined;
  clear: () => void;
}

let seq = 0;
const MAX_LOG = 50;

export const useDice = create<DiceState>()((set, get) => {
  const push = (entry: Omit<RollEntry, 'id' | 'at'>): RollEntry => {
    const full = { ...entry, id: ++seq, at: Date.now() };
    set((s) => ({ log: [full, ...s.log].slice(0, MAX_LOG), last: full }));
    return full;
  };

  return {
    mode: 'normal',
    setMode: (mode) => set({ mode }),
    log: [],
    check: (who, label, bonus) => {
      const mode = get().mode;
      const r = rollD20(bonus, mode);
      const tag = mode === 'advantage' ? ' con ventaja' : mode === 'disadvantage' ? ' con desventaja' : '';
      if (mode !== 'normal') set({ mode: 'normal' });
      return push({
        who,
        label: label + tag,
        detail: `d20 (${r.rolls.join(', ')}) ${formatMod(bonus)}`,
        total: r.total,
        natural: r.natural,
        crit: r.natural === 20 ? 'success' : r.natural === 1 ? 'fail' : undefined,
      });
    },
    expr: (who, label, expression) => {
      try {
        const r = roll(expression);
        const dice = r.groups.map((g) => `${g.sign < 0 ? '−' : ''}${g.count}d${g.sides} (${g.rolls.join(', ')})`).join(' ');
        const mod = r.modifier ? ` ${formatMod(r.modifier)}` : '';
        return push({ who, label, detail: dice + mod, total: r.total });
      } catch (e) {
        useUi.getState().toast(e instanceof DiceError ? e.message : 'Tirada inválida.', 'error');
        return undefined;
      }
    },
    clear: () => set({ log: [], last: undefined }),
  };
});
