import { describe, expect, it } from 'vitest';
import { pc } from '../test/fixtures';
import { casterLevel, pactSlots, spellSlots } from './spellSlots';

const slots = (classes: [string, number, string?][]) => spellSlots(pc(classes).classes);

describe('espacios de conjuro', () => {
  it('lanzador completo', () => {
    expect(slots([['wizard', 1]])).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(slots([['wizard', 5]])).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(slots([['wizard', 20]])).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('medio lanzador de una sola clase usa su propia tabla', () => {
    expect(slots([['paladin', 1]])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(slots([['paladin', 2]])).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(slots([['paladin', 5]])).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(slots([['ranger', 20]])).toEqual([4, 3, 3, 3, 2, 0, 0, 0, 0]);
  });

  it('artífice redondea hacia arriba desde nivel 1', () => {
    expect(slots([['artificer', 1]])).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('un tercio: Caballero arcano', () => {
    expect(slots([['fighter', 2, 'eldritch-knight']])[0]).toBe(0);
    expect(slots([['fighter', 3, 'eldritch-knight']])).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(slots([['fighter', 7, 'eldritch-knight']])).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(slots([['fighter', 7]])[0]).toBe(0);
  });

  it('multiclase (PHB p. 164)', () => {
    // Paladín 3 + Hechicero 2 → 1 + 2 = nivel 3
    expect(casterLevel(pc([['paladin', 3], ['sorcerer', 2]]).classes)).toBe(3);
    // Mago 3 + Pícaro (Embaucador arcano) 4 → 3 + 1 = 4
    expect(casterLevel(pc([['wizard', 3], ['rogue', 4, 'arcane-trickster']]).classes)).toBe(4);
    // Paladín 1 + Explorador 1 → 0 + 0
    expect(casterLevel(pc([['paladin', 1], ['ranger', 1]]).classes)).toBe(0);
  });

  it('el brujo no suma a la tabla común', () => {
    expect(slots([['warlock', 5], ['sorcerer', 1]])).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('magia de pacto', () => {
  it.each([
    [1, 1, 1], [2, 2, 1], [3, 2, 2], [5, 2, 3], [9, 2, 5], [11, 3, 5], [17, 4, 5],
  ])('brujo %i → %i espacios de nivel %i', (lvl, count, level) => {
    expect(pactSlots(pc([['warlock', lvl]]).classes)).toEqual({ count, level });
  });

  it('sin brujo no hay pacto', () => {
    expect(pactSlots(pc([['wizard', 5]]).classes)).toEqual({ count: 0, level: 0 });
  });
});
