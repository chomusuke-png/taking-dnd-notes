import type { Character, Condition } from '../db/types';

// Operaciones puras sobre los PG: reciben un personaje y devuelven uno nuevo.

const withCondition = (list: Condition[], cond: Condition, on: boolean): Condition[] =>
  on ? (list.includes(cond) ? list : [...list, cond]) : list.filter((x) => x !== cond);

/** PG máximos efectivos: el agotamiento de nivel 4+ los reduce a la mitad. */
export const effectiveMaxHp = (c: Character): number => (c.exhaustion >= 4 ? Math.floor(c.hp.max / 2) : c.hp.max);

export const isDead = (c: Character): boolean => c.deathSaves.fail >= 3;

export type DamageOutcome = 'ok' | 'down' | 'dead';

/**
 * Aplica daño (PHB p. 197-198): primero se consumen los PG temporales. Si el daño sobrante
 * tras llegar a 0 iguala o supera los PG máximos, muerte instantánea. Recibir daño estando
 * a 0 PG suma un fallo de salvación de muerte (dos si es crítico).
 */
export function applyDamage(c: Character, amount: number, critical = false): { character: Character; outcome: DamageOutcome } {
  if (amount <= 0) return { character: c, outcome: 'ok' };
  const fromTemp = Math.min(c.hp.temp, amount);
  const rest = amount - fromTemp;
  const temp = c.hp.temp - fromTemp;

  if (c.hp.current === 0) {
    if (rest === 0) return { character: { ...c, hp: { ...c.hp, temp } }, outcome: 'down' };
    const fail = rest >= c.hp.max ? 3 : Math.min(3, c.deathSaves.fail + (critical ? 2 : 1));
    const character = { ...c, hp: { ...c.hp, temp }, deathSaves: { ...c.deathSaves, fail } };
    return { character, outcome: fail >= 3 ? 'dead' : 'down' };
  }

  const overflow = rest - c.hp.current;
  if (overflow < 0) return { character: { ...c, hp: { ...c.hp, temp, current: c.hp.current - rest } }, outcome: 'ok' };

  const dead = overflow >= c.hp.max;
  return {
    character: {
      ...c,
      hp: { ...c.hp, temp, current: 0 },
      deathSaves: { success: 0, fail: dead ? 3 : 0 },
      conditions: withCondition(c.conditions, 'unconscious', true),
    },
    outcome: dead ? 'dead' : 'down',
  };
}

/** Curar desde 0 PG devuelve la conciencia y reinicia las salvaciones de muerte. */
export function heal(c: Character, amount: number): Character {
  if (amount <= 0 || isDead(c)) return c;
  const current = Math.min(effectiveMaxHp(c), c.hp.current + amount);
  if (c.hp.current > 0) return { ...c, hp: { ...c.hp, current } };
  return {
    ...c,
    hp: { ...c.hp, current },
    deathSaves: { success: 0, fail: 0 },
    conditions: withCondition(c.conditions, 'unconscious', false),
  };
}

/** Los PG temporales no se acumulan: se reemplazan por el valor indicado. */
export const setTempHp = (c: Character, amount: number): Character => ({ ...c, hp: { ...c.hp, temp: Math.max(0, amount) } });

export type DeathSaveOutcome = 'success' | 'fail' | 'stable' | 'dead' | 'revived';

/**
 * Resuelve una salvación de muerte (PHB p. 197): `d20` es el natural y `bonus` los
 * bonificadores a salvaciones que apliquen. El 1 y el 20 naturales mandan.
 */
export function rollDeathSave(c: Character, d20: number, bonus = 0): { character: Character; outcome: DeathSaveOutcome } {
  if (d20 === 20) return { character: heal(c, 1), outcome: 'revived' };
  if (d20 === 1 || d20 + bonus < 10) {
    const fail = Math.min(3, c.deathSaves.fail + (d20 === 1 ? 2 : 1));
    return { character: { ...c, deathSaves: { ...c.deathSaves, fail } }, outcome: fail >= 3 ? 'dead' : 'fail' };
  }
  const success = c.deathSaves.success + 1;
  if (success >= 3) return { character: { ...c, deathSaves: { success: 0, fail: 0 } }, outcome: 'stable' };
  return { character: { ...c, deathSaves: { ...c.deathSaves, success } }, outcome: 'success' };
}
