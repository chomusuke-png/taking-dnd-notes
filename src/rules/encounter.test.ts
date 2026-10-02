import { describe, expect, it } from 'vitest';
import type { Encounter } from '../db/types';
import type { SrdMonster } from '../srd/types';
import { pc } from '../test/fixtures';
import {
  addCombatants, characterCombatant, customCombatant, damageCombatant, encounterDifficulty, healCombatant, monsterCombatants,
  nextTurn, patchCombatant, previousTurn, removeCombatant, rollInitiatives, sortCombatants, startEncounter, xpPerCharacter,
} from './encounter';

const goblin: SrdMonster = {
  id: 'goblin', name: 'Goblin', size: 'Small', type: 'humanoid', alignment: '', ac: 15, hp: 7, hitDice: '2d6', hpRoll: '2d6',
  speed: '30 ft.', abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, senses: '', languages: '', cr: 0.25, xp: 50,
  traits: [], actions: [], reactions: [], legendary: [],
};

const empty = (): Encounter => ({
  id: 'e', campaignId: 'c', name: 'Emboscada', round: 0, ended: false, combatants: [], createdAt: 0, updatedAt: 0,
});

describe('dificultad (DMG p. 82)', () => {
  it('4 PJ de nivel 1 contra 4 goblins: 200 PX × 2 = 400, mortal', () => {
    const r = encounterDifficulty([1, 1, 1, 1], [50, 50, 50, 50]);
    expect(r).toMatchObject({ totalXp: 200, multiplier: 2, adjustedXp: 400, rating: 'deadly' });
    expect(r.thresholds).toEqual({ easy: 100, medium: 200, hard: 300, deadly: 400 });
  });

  it('grupos pequeños suben el multiplicador y grandes lo bajan', () => {
    expect(encounterDifficulty([3, 3], [450]).multiplier).toBe(1.5);
    expect(encounterDifficulty([3, 3, 3, 3, 3, 3], [450]).multiplier).toBe(0.5);
    expect(encounterDifficulty([5, 5, 5, 5], Array(20).fill(10)).multiplier).toBe(4);
  });

  it('fácil, media, trivial y sin datos', () => {
    expect(encounterDifficulty([3, 3, 3, 3], [200]).rating).toBe('trivial');
    expect(encounterDifficulty([3, 3, 3, 3], [450]).rating).toBe('easy');
    expect(encounterDifficulty([3, 3, 3, 3], [700]).rating).toBe('medium');
    expect(encounterDifficulty([], [700]).rating).toBe('none');
  });
});

describe('combatientes', () => {
  it('monstruos numerados con PG promedio o tirados', () => {
    const first = monsterCombatants(empty(), goblin, 1, false);
    expect(first[0]).toMatchObject({ name: 'Goblin', hp: 7, maxHp: 7, ac: 15, initBonus: 2, initiative: null });
    const enc = addCombatants(empty(), first);
    const more = monsterCombatants(enc, goblin, 2, true, () => 0); // 2d6 mínimos = 2
    expect(more.map((m) => [m.name, m.hp])).toEqual([['Goblin 2', 2], ['Goblin 3', 2]]);
  });

  it('personajes toman bono de iniciativa, CA y PG de la hoja', () => {
    const c = pc([['fighter', 3]], { abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 }, hp: { current: 20, max: 28, temp: 0 } });
    expect(characterCombatant(c)).toMatchObject({ ref: { type: 'character', id: c.id }, initBonus: 2, ac: 12, hp: 20, maxHp: 28 });
  });

  it('orden: iniciativa, luego bono, sin tirar al final', () => {
    const a = { ...customCombatant({ name: 'A', hp: 1, ac: 10, initBonus: 1 }), initiative: 15 };
    const b = { ...customCombatant({ name: 'B', hp: 1, ac: 10, initBonus: 3 }), initiative: 15 };
    const c = customCombatant({ name: 'C', hp: 1, ac: 10, initBonus: 9 });
    const d = { ...customCombatant({ name: 'D', hp: 1, ac: 10, initBonus: 0 }), initiative: 20 };
    expect(sortCombatants([a, b, c, d]).map((x) => x.name)).toEqual(['D', 'B', 'A', 'C']);
  });

  it('tirar iniciativa solo a los que faltan', () => {
    let enc = addCombatants(empty(), [
      { ...customCombatant({ name: 'Ya', hp: 1, ac: 10, initBonus: 0 }), initiative: 3 },
      customCombatant({ name: 'Falta', hp: 1, ac: 10, initBonus: 5 }),
    ]);
    enc = rollInitiatives(enc, 'missing', () => 0.5); // d20 = 11
    expect(enc.combatants.map((c) => [c.name, c.initiative])).toEqual([['Falta', 16], ['Ya', 3]]);
  });
});

describe('turnos', () => {
  function battle() {
    const mk = (name: string, init: number) => ({ ...customCombatant({ name, hp: 5, ac: 10, initBonus: 0 }), initiative: init });
    return startEncounter(addCombatants(empty(), [mk('A', 20), mk('B', 15), mk('C', 10)]));
  }
  const active = (e: Encounter) => e.combatants.find((c) => c.id === e.activeId)?.name;

  it('empieza en el primero y avanza de ronda al dar la vuelta', () => {
    let e = battle();
    expect([active(e), e.round]).toEqual(['A', 1]);
    e = nextTurn(nextTurn(e));
    expect([active(e), e.round]).toEqual(['C', 1]);
    e = nextTurn(e);
    expect([active(e), e.round]).toEqual(['A', 2]);
    e = previousTurn(e);
    expect([active(e), e.round]).toEqual(['C', 1]);
  });

  it('salta a los monstruos derrotados', () => {
    let e = battle();
    const b = e.combatants.find((c) => c.name === 'B')!;
    e = patchCombatant(e, b.id, { hp: 0 });
    expect(active(nextTurn(e))).toBe('C');
  });

  it('cambiar la iniciativa en pleno combate no pierde el turno actual', () => {
    let e = nextTurn(battle()); // turno de B
    const c = e.combatants.find((x) => x.name === 'C')!;
    e = patchCombatant(e, c.id, { initiative: 25 });
    expect(active(e)).toBe('B');
    expect(e.combatants[0].name).toBe('C');
  });

  it('quitar al activo pasa el turno al siguiente', () => {
    const e = battle();
    expect(active(removeCombatant(e, e.activeId!))).toBe('B');
  });
});

describe('PG y PX', () => {
  it('daño consume temporales y no baja de 0; curación no supera el máximo', () => {
    const g = { ...customCombatant({ name: 'G', hp: 10, ac: 10, initBonus: 0 }), tempHp: 3 };
    expect(damageCombatant(g, 5)).toMatchObject({ tempHp: 0, hp: 8 });
    expect(damageCombatant(g, 50).hp).toBe(0);
    expect(healCombatant({ ...g, hp: 2 }, 50).hp).toBe(10);
  });

  it('reparto de PX', () => {
    expect(xpPerCharacter([50, 50, 50], 4)).toBe(37);
  });
});
