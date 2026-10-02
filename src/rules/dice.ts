export type Rng = () => number;

export interface DiceGroup {
  sign: 1 | -1;
  count: number;
  sides: number;
  rolls: number[];
}

export interface RollResult {
  expression: string;
  groups: DiceGroup[];
  modifier: number;
  total: number;
}

const TERM_RE = /([+-])?\s*(?:(\d*)d(\d+)|(\d+))/gy;

export class DiceError extends Error {}

export const rollDie = (sides: number, rng: Rng = Math.random): number => Math.floor(rng() * sides) + 1;

/** Tira una expresión como "2d6+1d4+3" o "d20-1". */
export function roll(expression: string, rng: Rng = Math.random): RollResult {
  // Solo se permiten espacios alrededor de + y -: "2d6 3" es un error, no "2d63".
  const expr = expression.trim().toLowerCase().replace(/\s*([+-])\s*/g, '$1');
  if (!expr) throw new DiceError('Expresión vacía.');
  const groups: DiceGroup[] = [];
  let modifier = 0;
  TERM_RE.lastIndex = 0;
  let consumed = 0;
  let match: RegExpExecArray | null;
  while ((match = TERM_RE.exec(expr))) {
    if (match[0] === '' || (consumed > 0 && !match[1])) break;
    consumed = TERM_RE.lastIndex;
    const sign: 1 | -1 = match[1] === '-' ? -1 : 1;
    if (match[3] !== undefined) {
      const count = match[2] ? Number(match[2]) : 1;
      const sides = Number(match[3]);
      if (count < 1 || count > 100 || sides < 1 || sides > 1000) throw new DiceError(`Dados fuera de rango: ${match[0]}`);
      groups.push({ sign, count, sides, rolls: Array.from({ length: count }, () => rollDie(sides, rng)) });
    } else {
      modifier += sign * Number(match[4]);
    }
  }
  if (consumed !== expr.length) throw new DiceError(`No entiendo "${expression}". Usa algo como 2d6+3.`);
  const total = groups.reduce((sum, g) => sum + g.sign * g.rolls.reduce((a, b) => a + b, 0), modifier);
  return { expression: expr, groups, modifier, total };
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface D20Result {
  rolls: number[];
  natural: number;
  bonus: number;
  total: number;
  mode: RollMode;
}

/** Tirada de d20 + bonificador, con ventaja o desventaja. */
export function rollD20(bonus: number, mode: RollMode = 'normal', rng: Rng = Math.random): D20Result {
  const rolls = mode === 'normal' ? [rollDie(20, rng)] : [rollDie(20, rng), rollDie(20, rng)];
  const natural = mode === 'advantage' ? Math.max(...rolls) : mode === 'disadvantage' ? Math.min(...rolls) : rolls[0];
  return { rolls, natural, bonus, total: natural + bonus, mode };
}
