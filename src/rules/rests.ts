import type { Character, HitDie } from '../db/types';
import { hitDiceTotals, mod, totalLevel } from './derive';
import { effectiveMaxHp, heal } from './hp';

export function hitDiceAvailable(c: Character, die: HitDie): number {
  return (hitDiceTotals(c)[die] ?? 0) - (c.hitDiceUsed[die] ?? 0);
}

/**
 * Gasta un dado de golpe durante un descanso corto con el resultado ya tirado.
 * Cada dado cura lo tirado + CON, como mínimo 0.
 */
export function spendHitDie(c: Character, die: HitDie, roll: number): { character: Character; healed: number } {
  if (hitDiceAvailable(c, die) <= 0) return { character: c, healed: 0 };
  const amount = Math.max(0, roll + mod(c, 'con'));
  const healed = heal(c, amount);
  return {
    character: { ...healed, hitDiceUsed: { ...c.hitDiceUsed, [die]: (c.hitDiceUsed[die] ?? 0) + 1 } },
    healed: healed.hp.current - c.hp.current,
  };
}

/** Descanso corto: recarga rasgos de descanso corto y la Magia de pacto. */
export function shortRest(c: Character): Character {
  return {
    ...c,
    features: c.features.map((f) => (f.uses?.recharge === 'short' ? { ...f, uses: { ...f.uses, used: 0 } } : f)),
    spellcasting: { ...c.spellcasting, pactSlotsUsed: 0 },
  };
}

/**
 * Descanso largo (PHB p. 186): PG al máximo, recupera hasta la mitad de los dados de golpe
 * (mínimo 1, primero los más grandes), recarga todo y reduce el agotamiento en 1.
 */
export function longRest(c: Character): Character {
  const exhaustion = Math.max(0, c.exhaustion - 1);
  const afterExhaustion = { ...c, exhaustion };

  let toRecover = Math.max(1, Math.floor(totalLevel(c) / 2));
  const hitDiceUsed = { ...c.hitDiceUsed };
  for (const die of [12, 10, 8, 6] as HitDie[]) {
    const back = Math.min(toRecover, hitDiceUsed[die] ?? 0);
    if (back > 0) hitDiceUsed[die] = (hitDiceUsed[die] ?? 0) - back;
    toRecover -= back;
  }

  const restored = c.hp.current === 0 && c.deathSaves.fail >= 3 ? c.hp.current : effectiveMaxHp(afterExhaustion);
  return {
    ...afterExhaustion,
    hp: { ...c.hp, current: restored, temp: 0 },
    hitDiceUsed,
    deathSaves: restored > 0 ? { success: 0, fail: 0 } : c.deathSaves,
    conditions: restored > 0 ? c.conditions.filter((x) => x !== 'unconscious') : c.conditions,
    features: c.features.map((f) => (f.uses ? { ...f, uses: { ...f.uses, used: 0 } } : f)),
    spellcasting: { ...c.spellcasting, slotsUsed: c.spellcasting.slotsUsed.map(() => 0), pactSlotsUsed: 0 },
  };
}
