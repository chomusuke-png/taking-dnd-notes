import { describe, expect, it } from 'vitest';
import { pc } from '../test/fixtures';
import { applyDamage, heal, rollDeathSave, setTempHp } from './hp';
import { longRest, shortRest, spendHitDie } from './rests';

const hurt = (current: number, max = 20, temp = 0) => pc([['fighter', 4]], { hp: { current, max, temp } });

describe('daño', () => {
  it('consume primero los PG temporales', () => {
    const { character, outcome } = applyDamage(hurt(20, 20, 5), 8);
    expect(character.hp).toEqual({ current: 17, max: 20, temp: 0 });
    expect(outcome).toBe('ok');
  });

  it('a 0 PG queda inconsciente', () => {
    const { character, outcome } = applyDamage(hurt(5), 10);
    expect(character.hp.current).toBe(0);
    expect(character.conditions).toContain('unconscious');
    expect(outcome).toBe('down');
  });

  it('muerte instantánea si el sobrante ≥ PG máximos', () => {
    expect(applyDamage(hurt(5), 25).outcome).toBe('dead');
    expect(applyDamage(hurt(5), 24).outcome).toBe('down');
  });

  it('daño a 0 PG suma fallos (2 si es crítico)', () => {
    const down = applyDamage(hurt(1), 1).character;
    expect(applyDamage(down, 3).character.deathSaves.fail).toBe(1);
    expect(applyDamage(down, 3, true).character.deathSaves.fail).toBe(2);
    expect(applyDamage(down, 20).outcome).toBe('dead');
  });
});

describe('curación y temporales', () => {
  it('no supera el máximo y despierta desde 0', () => {
    const down = applyDamage(hurt(1), 3).character;
    const healed = heal({ ...down, deathSaves: { success: 1, fail: 2 } }, 50);
    expect(healed.hp.current).toBe(20);
    expect(healed.deathSaves).toEqual({ success: 0, fail: 0 });
    expect(healed.conditions).not.toContain('unconscious');
  });

  it('agotamiento 4 reduce el máximo a la mitad', () => {
    expect(heal({ ...hurt(1), exhaustion: 4 }, 50).hp.current).toBe(10);
  });

  it('los temporales se reemplazan, no se suman', () => {
    expect(setTempHp(hurt(20, 20, 5), 3).hp.temp).toBe(3);
  });
});

describe('salvaciones de muerte', () => {
  const down = applyDamage(hurt(1), 2).character;

  it('20 natural recupera 1 PG', () => {
    const r = rollDeathSave(down, 20);
    expect(r.outcome).toBe('revived');
    expect(r.character.hp.current).toBe(1);
  });

  it('1 natural son dos fallos', () => {
    expect(rollDeathSave(down, 1).character.deathSaves.fail).toBe(2);
  });

  it('tres éxitos estabilizan', () => {
    expect(rollDeathSave({ ...down, deathSaves: { success: 2, fail: 1 } }, 10).outcome).toBe('stable');
  });

  it('los bonificadores cuentan, salvo en un 1 natural', () => {
    expect(rollDeathSave(down, 8, 2).outcome).toBe('success');
    expect(rollDeathSave(down, 1, 10).character.deathSaves.fail).toBe(2);
  });

  it('tres fallos matan', () => {
    expect(rollDeathSave({ ...down, deathSaves: { success: 0, fail: 2 } }, 5).outcome).toBe('dead');
  });
});

describe('descansos', () => {
  it('gastar un dado de golpe cura tirada + CON y lo marca usado', () => {
    const c = pc([['fighter', 2]], {
      hp: { current: 5, max: 20, temp: 0 },
      abilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
    });
    const { character, healed } = spendHitDie(c, 10, 6);
    expect(healed).toBe(8);
    expect(character.hitDiceUsed[10]).toBe(1);
    const again = spendHitDie(spendHitDie(character, 10, 1).character, 10, 1);
    expect(again.healed).toBe(0); // ya no quedan dados
  });

  it('corto recarga rasgos de descanso corto y la Magia de pacto', () => {
    const c = pc([['warlock', 2]]);
    c.features = [
      { id: 'a', name: 'Oleada', source: '', description: '', uses: { max: 1, used: 1, recharge: 'short' } },
      { id: 'b', name: 'Furia', source: '', description: '', uses: { max: 2, used: 2, recharge: 'long' } },
    ];
    c.spellcasting.pactSlotsUsed = 2;
    const r = shortRest(c);
    expect(r.features[0].uses?.used).toBe(0);
    expect(r.features[1].uses?.used).toBe(2);
    expect(r.spellcasting.pactSlotsUsed).toBe(0);
  });

  it('largo restaura PG y espacios, recupera la mitad de los dados y baja el agotamiento', () => {
    const c = pc([['fighter', 3], ['wizard', 2]], { hp: { current: 3, max: 30, temp: 4 }, exhaustion: 2 });
    c.hitDiceUsed = { 10: 3, 6: 2 };
    c.spellcasting.slotsUsed = [2, 1, 0, 0, 0, 0, 0, 0, 0];
    const r = longRest(c);
    expect(r.hp).toEqual({ current: 30, max: 30, temp: 0 });
    expect(r.hitDiceUsed).toEqual({ 10: 1, 6: 2 }); // recupera 2 (mitad de 5), primero los d10
    expect(r.spellcasting.slotsUsed.every((n) => n === 0)).toBe(true);
    expect(r.exhaustion).toBe(1);
  });
});
