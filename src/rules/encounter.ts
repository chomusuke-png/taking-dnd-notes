import type { Character, Combatant, Encounter } from '../db/types';
import { newId } from '../lib/id';
import type { SrdMonster } from '../srd/types';
import { abilityMod, armorClass, initiative } from './derive';
import { roll, rollDie, type Rng } from './dice';

// ---------- Dificultad (DMG p. 82) ----------

/** Umbrales de PX por personaje según nivel: [fácil, media, difícil, mortal]. */
const XP_THRESHOLDS: [number, number, number, number][] = [
  [0, 0, 0, 0],
  [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100],
  [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400], [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700],
];

const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

function multiplierStep(monsters: number): number {
  if (monsters <= 1) return 1;
  if (monsters === 2) return 2;
  if (monsters <= 6) return 3;
  if (monsters <= 10) return 4;
  if (monsters <= 14) return 5;
  return 6;
}

export type Difficulty = 'none' | 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';

export interface DifficultyResult {
  totalXp: number;
  adjustedXp: number;
  multiplier: number;
  thresholds: { easy: number; medium: number; hard: number; deadly: number };
  rating: Difficulty;
}

/**
 * Dificultad de un encuentro: PX de los monstruos × multiplicador por cantidad, ajustado
 * por tamaño del grupo (menos de 3 PJ sube un escalón; 6 o más baja uno).
 */
export function encounterDifficulty(partyLevels: number[], monsterXps: number[]): DifficultyResult {
  const thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const lvl of partyLevels) {
    const t = XP_THRESHOLDS[Math.min(20, Math.max(1, lvl))];
    thresholds.easy += t[0];
    thresholds.medium += t[1];
    thresholds.hard += t[2];
    thresholds.deadly += t[3];
  }
  const totalXp = monsterXps.reduce((a, b) => a + b, 0);
  let step = multiplierStep(monsterXps.length);
  if (partyLevels.length > 0 && partyLevels.length < 3) step += 1;
  else if (partyLevels.length >= 6) step -= 1;
  const multiplier = monsterXps.length === 0 ? 1 : MULTIPLIERS[Math.max(0, Math.min(MULTIPLIERS.length - 1, step))];
  const adjustedXp = Math.round(totalXp * multiplier);

  let rating: Difficulty = 'none';
  if (partyLevels.length > 0 && monsterXps.length > 0) {
    rating =
      adjustedXp >= thresholds.deadly ? 'deadly'
      : adjustedXp >= thresholds.hard ? 'hard'
      : adjustedXp >= thresholds.medium ? 'medium'
      : adjustedXp >= thresholds.easy ? 'easy'
      : 'trivial';
  }
  return { totalXp, adjustedXp, multiplier, thresholds, rating };
}

// ---------- Combatientes ----------

export const isCharacter = (cb: Combatant) => cb.ref.type === 'character';

/** Un monstruo (o combatiente personalizado) a 0 PG queda fuera de combate; los personajes no (tiran salvaciones). */
export const isDefeated = (cb: Combatant) => !isCharacter(cb) && cb.hp <= 0;

export function monsterCombatants(enc: Encounter, m: SrdMonster, count: number, rollHp: boolean, rng?: Rng): Combatant[] {
  const existing = enc.combatants.filter((cb) => cb.ref.type === 'srdMonster' && cb.ref.id === m.id).length;
  const numbered = count > 1 || existing > 0;
  return Array.from({ length: count }, (_, i) => {
    const hp = rollHp ? Math.max(1, roll(m.hpRoll, rng).total) : m.hp;
    return {
      id: newId(),
      ref: { type: 'srdMonster', id: m.id },
      name: numbered ? `${m.name} ${existing + i + 1}` : m.name,
      initiative: null,
      initBonus: abilityMod(m.abilities.dex),
      hp,
      maxHp: hp,
      tempHp: 0,
      ac: m.ac,
      conditions: [],
      notes: '',
    };
  });
}

export function characterCombatant(c: Character): Combatant {
  return {
    id: newId(),
    ref: { type: 'character', id: c.id },
    name: c.name,
    initiative: null,
    initBonus: initiative(c),
    hp: c.hp.current,
    maxHp: c.hp.max,
    tempHp: c.hp.temp,
    ac: armorClass(c),
    conditions: [],
    notes: '',
  };
}

export function customCombatant(input: { name: string; hp: number; ac: number; initBonus: number }): Combatant {
  return {
    id: newId(),
    ref: { type: 'custom' },
    name: input.name,
    initiative: null,
    initBonus: input.initBonus,
    hp: input.hp,
    maxHp: input.hp,
    tempHp: 0,
    ac: input.ac,
    conditions: [],
    notes: '',
  };
}

/** Orden de iniciativa: mayor primero; empate por bono; sin tirar al final. */
export function sortCombatants(list: Combatant[]): Combatant[] {
  return [...list].sort((a, b) => {
    if (a.initiative === null && b.initiative !== null) return 1;
    if (b.initiative === null && a.initiative !== null) return -1;
    return (b.initiative ?? 0) - (a.initiative ?? 0) || b.initBonus - a.initBonus || a.name.localeCompare(b.name, 'es');
  });
}

export function addCombatants(enc: Encounter, list: Combatant[]): Encounter {
  return { ...enc, combatants: sortCombatants([...enc.combatants, ...list]) };
}

export function patchCombatant(enc: Encounter, id: string, patch: Partial<Combatant>): Encounter {
  const combatants = enc.combatants.map((cb) => (cb.id === id ? { ...cb, ...patch } : cb));
  return { ...enc, combatants: 'initiative' in patch ? sortCombatants(combatants) : combatants };
}

export function removeCombatant(enc: Encounter, id: string): Encounter {
  let activeId = enc.activeId;
  if (activeId === id) activeId = nextActive(enc, 1)?.id;
  if (activeId === id) activeId = undefined;
  return { ...enc, activeId, combatants: enc.combatants.filter((cb) => cb.id !== id) };
}

export type InitiativeScope = 'missing' | 'monsters' | 'all';

export function rollInitiatives(enc: Encounter, scope: InitiativeScope, rng?: Rng): Encounter {
  const pick = (cb: Combatant) =>
    scope === 'all' || (scope === 'missing' && cb.initiative === null) || (scope === 'monsters' && !isCharacter(cb));
  return {
    ...enc,
    combatants: sortCombatants(enc.combatants.map((cb) => (pick(cb) ? { ...cb, initiative: rollDie(20, rng) + cb.initBonus } : cb))),
  };
}

// ---------- Turnos ----------

/** Siguiente (dir 1) o anterior (dir −1) combatiente activo, saltando monstruos derrotados. */
function nextActive(enc: Encounter, dir: 1 | -1): { id: string; wrapped: boolean } | undefined {
  const order = sortCombatants(enc.combatants);
  if (order.length === 0) return undefined;
  const start = Math.max(0, order.findIndex((cb) => cb.id === enc.activeId));
  for (let step = 1; step <= order.length; step++) {
    const raw = start + dir * step;
    const i = ((raw % order.length) + order.length) % order.length;
    if (!isDefeated(order[i])) return { id: order[i].id, wrapped: dir === 1 ? raw >= order.length : raw < 0 };
  }
  return undefined;
}

/** Empieza el combate: ronda 1, turno del primero en iniciativa que siga en pie. */
export function startEncounter(enc: Encounter): Encounter {
  const order = sortCombatants(enc.combatants);
  const first = order.find((cb) => !isDefeated(cb));
  return { ...enc, combatants: order, round: 1, activeId: first?.id, ended: false };
}

export function nextTurn(enc: Encounter): Encounter {
  const next = nextActive(enc, 1);
  if (!next) return enc;
  return { ...enc, activeId: next.id, round: enc.round + (next.wrapped ? 1 : 0) };
}

export function previousTurn(enc: Encounter): Encounter {
  const prev = nextActive(enc, -1);
  if (!prev) return enc;
  return { ...enc, activeId: prev.id, round: Math.max(1, enc.round - (prev.wrapped ? 1 : 0)) };
}

export function endEncounter(enc: Encounter): Encounter {
  return { ...enc, ended: true, activeId: undefined };
}

// ---------- PG de monstruos ----------

export function damageCombatant(cb: Combatant, amount: number): Combatant {
  if (amount <= 0) return cb;
  const fromTemp = Math.min(cb.tempHp, amount);
  return { ...cb, tempHp: cb.tempHp - fromTemp, hp: Math.max(0, cb.hp - (amount - fromTemp)) };
}

export function healCombatant(cb: Combatant, amount: number): Combatant {
  return amount <= 0 ? cb : { ...cb, hp: Math.min(cb.maxHp, cb.hp + amount) };
}

/** PX por personaje al repartir los monstruos derrotados entre el grupo. */
export function xpPerCharacter(defeatedXp: number[], partySize: number): number {
  const total = defeatedXp.reduce((a, b) => a + b, 0);
  return partySize > 0 ? Math.floor(total / partySize) : total;
}
