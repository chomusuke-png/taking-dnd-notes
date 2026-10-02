import { describe, expect, it } from 'vitest';
import { normalizeCharacter } from './normalize';
import type { Character } from './types';

describe('normalizeCharacter', () => {
  it('completa campos faltantes de un personaje del modelo F0 sin perder datos', () => {
    const old = {
      id: 'x', campaignId: 'c', name: 'Viejo', kind: 'pc',
      abilities: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      proficiencies: { saves: ['str'], skills: { athletics: 1, arcana: 0.5 }, armor: [], weapons: [], tools: [], languages: [] },
      hp: { max: 12, current: 7, temp: 0 },
      spellcasting: { entries: [], slotsUsed: [1], pactSlotsUsed: 0 },
      inventory: [{ id: 'i', item: { custom: 'Cuerda' }, qty: 1 }, { id: 'j', item: { source: 'srd', id: 'longsword' }, qty: 1 }],
    } as unknown as Character;

    const c = normalizeCharacter(old);
    expect(c.abilities.str).toBe(18);
    expect(c.hp.current).toBe(7);
    expect(c.armor.kind).toBe('none');
    expect(c.bonuses.initiative).toBe(0);
    expect(c.proficiencies.skills).toEqual({ athletics: 1 });
    expect(c.proficiencies.jackOfAllTrades).toBe(true);
    expect(c.spellcasting.slotsUsed).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(c.currency.gp).toBe(0);
    expect(c.inventory.map((i) => i.name)).toEqual(['Cuerda', 'longsword']);
  });
});
