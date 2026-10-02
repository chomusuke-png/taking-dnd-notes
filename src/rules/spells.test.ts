import { describe, expect, it } from 'vitest';
import { pc } from '../test/fixtures';
import type { SrdItem, SrdSpell } from '../srd/types';
import { armorFromItem, attackFromWeapon, inventoryFromSrd, isProficientWith } from './items';
import { addSpell, castOptions, preparedLimit, removeSpell, spellListClass, spellRoll, spendSlot, togglePrepared } from './spells';

const abilities = { str: 10, dex: 16, con: 12, int: 18, wis: 14, cha: 8 };

const spell = (p: Partial<SrdSpell>): SrdSpell => ({
  id: 'x', name: 'X', level: 1, school: 'evocation', castingTime: '', range: '', components: '', duration: '',
  concentration: false, ritual: false, classes: [], desc: '', ...p,
});

describe('conjuros en la hoja', () => {
  it('agregar, preparar y quitar conjuros por clase', () => {
    let c = pc([['wizard', 3]], { abilities });
    c = addSpell(c, 'wizard', 'magic-missile');
    c = addSpell(c, 'wizard', 'magic-missile'); // sin duplicados
    c = togglePrepared(c, 'wizard', 'magic-missile');
    expect(c.spellcasting.entries).toEqual([
      { classId: 'wizard', ability: 'int', known: [{ source: 'srd', id: 'magic-missile' }], prepared: [{ source: 'srd', id: 'magic-missile' }] },
    ]);
    c = removeSpell(c, 'wizard', 'magic-missile');
    expect(c.spellcasting.entries[0].known).toEqual([]);
    expect(c.spellcasting.entries[0].prepared).toEqual([]);
  });

  it('límite de preparados', () => {
    expect(preparedLimit(pc([['wizard', 3]], { abilities }), { classId: 'wizard', level: 3, hitDie: 6 })).toBe(4 + 3);
    expect(preparedLimit(pc([['paladin', 5]], { abilities }), { classId: 'paladin', level: 5, hitDie: 10 })).toBe(1); // −1 + 2
    expect(preparedLimit(pc([['sorcerer', 5]], { abilities }), { classId: 'sorcerer', level: 5, hitDie: 6 })).toBeUndefined();
  });

  it('Caballero arcano elige de la lista del mago', () => {
    expect(spellListClass({ classId: 'fighter', subclassId: 'eldritch-knight', level: 3, hitDie: 10 })).toBe('wizard');
    expect(spellListClass({ classId: 'cleric', level: 3, hitDie: 8 })).toBe('cleric');
  });

  it('opciones para lanzar y gasto de espacios, incluido el pacto', () => {
    const c = pc([['wizard', 5], ['warlock', 2]]);
    expect(castOptions(c, 0)).toEqual([]);
    expect(castOptions(c, 2)).toEqual([
      { level: 2, kind: 'slot', available: 3 },
      { level: 3, kind: 'slot', available: 2 }, // mago 5: [4, 3, 2]
    ]);
    expect(castOptions(c, 1).at(-1)).toEqual({ level: 1, kind: 'pact', available: 2 });
    const used = spendSlot(spendSlot(c, { level: 2, kind: 'slot' }), { level: 1, kind: 'pact' });
    expect(used.spellcasting.slotsUsed[1]).toBe(1);
    expect(used.spellcasting.pactSlotsUsed).toBe(1);
  });

  it('daño por nivel de espacio, trucos por nivel de personaje y curación con MOD', () => {
    const c = pc([['wizard', 5]], { abilities });
    expect(spellRoll(spell({ level: 3, damageAtSlot: { 3: '8d6', 4: '9d6' } }), 4, c, 4)).toEqual({ kind: 'damage', expression: '9d6' });
    expect(spellRoll(spell({ level: 0, damageAtCharLevel: { 1: '1d10', 5: '2d10', 11: '3d10' } }), 0, c, 4)?.expression).toBe('2d10');
    expect(spellRoll(spell({ healAtSlot: { 1: '1d8 + MOD', 2: '2d8 + MOD' } }), 2, c, 3)).toEqual({ kind: 'heal', expression: '2d8+3' });
    expect(spellRoll(spell({ healAtSlot: { 1: '1d8 + MOD' } }), 1, c, -1)?.expression).toBe('1d8-1');
    expect(spellRoll(spell({}), 1, c, 0)).toBeUndefined();
  });
});

describe('objetos del SRD en la hoja', () => {
  const rapier: SrdItem = {
    id: 'rapier', name: 'Rapier', category: 'weapon', weight: 2,
    weapon: { simple: false, ranged: false, damage: '1d8', damageType: 'piercing', properties: ['finesse'] },
  };
  const dagger: SrdItem = { ...rapier, id: 'dagger', name: 'Dagger', weapon: { ...rapier.weapon!, simple: true } };

  it('inventario conserva referencia, nombre y peso', () => {
    expect(inventoryFromSrd(rapier, 2)).toMatchObject({ item: { source: 'srd', id: 'rapier' }, name: 'Rapier', qty: 2, weight: 2 });
  });

  it('arma sutil usa DES si es mejor; daño en español', () => {
    const atk = attackFromWeapon(pc([['rogue', 1]], { abilities }), rapier)!;
    expect(atk).toMatchObject({ ability: 'dex', damage: '1d8', damageType: 'perforante', proficient: true });
  });

  it('competencia según la lista escrita', () => {
    const c = pc([['wizard', 1]]);
    c.proficiencies.weapons = ['Dagas', 'Sencillas'];
    expect(isProficientWith(c, dagger)).toBe(true);
    expect(isProficientWith(c, rapier)).toBe(false);
    c.proficiencies.weapons = ['Rapier'];
    expect(isProficientWith(c, rapier)).toBe(true);
  });

  it('armadura y escudo', () => {
    const base = { kind: 'none' as const, base: 10, shield: false, unarmoredDefense: 'none' as const, bonus: 0 };
    const mail: SrdItem = { id: 'chain-mail', name: 'Chain Mail', category: 'armor', armor: { kind: 'heavy', base: 16, stealthDisadvantage: true } };
    const shield: SrdItem = { id: 'shield', name: 'Shield', category: 'armor', armor: { kind: 'shield', base: 2, stealthDisadvantage: false } };
    expect(armorFromItem(base, mail)).toMatchObject({ kind: 'heavy', base: 16, shield: false });
    expect(armorFromItem(base, shield)).toMatchObject({ kind: 'none', shield: true });
    expect(armorFromItem(base, rapier)).toBeUndefined();
  });
});
