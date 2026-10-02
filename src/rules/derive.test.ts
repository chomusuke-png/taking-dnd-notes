import { describe, expect, it } from 'vitest';
import { pc } from '../test/fixtures';
import {
  abilityMod, armorClass, attackBonus, averageHp, damageExpression, encumbrance, formatMod, hitDiceTotals, initiative,
  inventoryWeight, passiveScore, proficiencyBonus, saveBonus, skillBonus, spellcastingStats,
} from './derive';

const abilities = { str: 16, dex: 14, con: 15, int: 8, wis: 10, cha: 12 };

describe('modificadores y competencia', () => {
  it.each([[1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [15, 2], [20, 5], [30, 10]])('mod(%i) = %i', (s, m) => {
    expect(abilityMod(s)).toBe(m);
  });

  it.each([[1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [13, 5], [17, 6], [20, 6]])('competencia nivel %i = +%i', (l, p) => {
    expect(proficiencyBonus(l)).toBe(p);
  });

  it('formatea con signo', () => {
    expect(formatMod(3)).toBe('+3');
    expect(formatMod(0)).toBe('+0');
    expect(formatMod(-1)).toBe('−1');
  });
});

describe('salvaciones y habilidades', () => {
  const c = pc([['fighter', 5]], { abilities });
  c.proficiencies.saves = ['str', 'con'];
  c.proficiencies.skills = { athletics: 1, intimidation: 2 };

  it('salvaciones con y sin competencia', () => {
    expect(saveBonus(c, 'str')).toBe(3 + 3);
    expect(saveBonus(c, 'dex')).toBe(2);
  });

  it('competencia y pericia', () => {
    expect(skillBonus(c, 'athletics')).toBe(3 + 3);
    expect(skillBonus(c, 'intimidation')).toBe(1 + 6);
    expect(skillBonus(c, 'perception')).toBe(0);
    expect(passiveScore(c, 'perception')).toBe(10);
  });

  it('Jack of all trades: mitad (hacia abajo) en habilidades sin competencia e iniciativa', () => {
    const bard = pc([['bard', 5]], { abilities });
    bard.proficiencies.jackOfAllTrades = true;
    bard.proficiencies.skills = { performance: 1 };
    expect(skillBonus(bard, 'arcana')).toBe(-1 + 1); // competencia 3 → 1
    expect(skillBonus(bard, 'performance')).toBe(1 + 3);
    expect(initiative(bard)).toBe(2 + 1);
  });

  it('bonificadores varios a salvaciones e iniciativa', () => {
    const r = pc([['wizard', 1]], { abilities, bonuses: { initiative: 5, saves: 1, spellDc: 0, spellAttack: 0 } });
    expect(initiative(r)).toBe(7);
    expect(saveBonus(r, 'wis')).toBe(1);
  });
});

describe('clase de armadura', () => {
  const base = pc([['fighter', 1]], { abilities: { ...abilities, dex: 18 } });
  const ac = (armor: Partial<typeof base.armor>, extra = {}) =>
    armorClass({ ...base, ...extra, armor: { ...base.armor, ...armor } });

  it('sin armadura, ligera, media y pesada', () => {
    expect(ac({})).toBe(14);
    expect(ac({ kind: 'light', base: 12 })).toBe(16);
    expect(ac({ kind: 'medium', base: 14 })).toBe(16);
    expect(ac({ kind: 'heavy', base: 18 })).toBe(18);
  });

  it('escudo y bonificadores', () => {
    expect(ac({ kind: 'heavy', base: 18, shield: true, bonus: 1 })).toBe(21);
  });

  it('defensa sin armadura de bárbaro y monje', () => {
    const abil = { ...abilities, dex: 14, con: 16, wis: 16 };
    expect(ac({ unarmoredDefense: 'barbarian', shield: true }, { abilities: abil })).toBe(10 + 2 + 3 + 2);
    expect(ac({ unarmoredDefense: 'monk' }, { abilities: abil })).toBe(10 + 2 + 3);
    expect(ac({ unarmoredDefense: 'monk', shield: true }, { abilities: abil })).toBe(10 + 2 + 2);
  });

  it('el override manda', () => {
    expect(ac({ kind: 'heavy', base: 18 }, { acOverride: 25 })).toBe(25);
  });
});

describe('conjuros y ataques', () => {
  it('CD y ataque por característica de lanzador', () => {
    const c = pc([['wizard', 5], ['cleric', 1]], { abilities: { ...abilities, int: 18, wis: 14 } });
    expect(spellcastingStats(c)).toEqual([
      { classId: 'wizard', ability: 'int', saveDc: 8 + 3 + 4, attack: 7 },
      { classId: 'cleric', ability: 'wis', saveDc: 8 + 3 + 2, attack: 5 },
    ]);
  });

  it('el Caballero arcano lanza con INT; un guerrero normal no lanza', () => {
    expect(spellcastingStats(pc([['fighter', 3, 'eldritch-knight']]))[0].ability).toBe('int');
    expect(spellcastingStats(pc([['fighter', 3]]))).toEqual([]);
  });

  it('ataque y daño con modificador', () => {
    const c = pc([['fighter', 5]], { abilities });
    const sword = {
      id: 'x', name: 'Espada larga', ability: 'str' as const, proficient: true, damage: '1d8', damageType: 'cortante', bonus: 1,
    };
    expect(attackBonus(c, sword)).toBe(3 + 3 + 1);
    expect(damageExpression(c, sword)).toBe('1d8+4');
    expect(damageExpression({ ...c, abilities: { ...abilities, str: 8 } }, { ...sword, bonus: 0 })).toBe('1d8-1');
  });
});

describe('PG, dados de golpe y carga', () => {
  it('PG promedio multiclase', () => {
    // Guerrero 3 (d10) / Mago 2 (d6), CON +2: (10+2) + 2×(6+2) + 2×(4+2)
    const c = pc([['fighter', 3], ['wizard', 2]], { abilities: { ...abilities, con: 14 } });
    expect(averageHp(c)).toBe(12 + 16 + 12);
    expect(hitDiceTotals(c)).toEqual({ 10: 3, 6: 2 });
  });

  it('el peso incluye monedas; carga variante', () => {
    const c = pc([], { abilities: { ...abilities, str: 10 } });
    c.inventory = [{ id: 'a', item: { custom: 'Cuerda' }, name: 'Cuerda', qty: 2, equipped: false, attuned: false, weight: 10, notes: '' }];
    c.currency = { cp: 0, sp: 0, ep: 0, gp: 100, pp: 0 };
    expect(inventoryWeight(c)).toBe(22);
    expect(encumbrance(c)).toBe('normal');
    c.inventory[0].qty = 5; // 50 + 2 > FUE × 5
    expect(encumbrance(c)).toBe('encumbered');
  });
});
