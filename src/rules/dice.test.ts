import { describe, expect, it } from 'vitest';
import { DiceError, roll, rollD20 } from './dice';

describe('roll', () => {
  it('suma grupos de dados y modificadores', () => {
    const r = roll('2d6+1d4+3', () => 0.999); // siempre la cara máxima
    expect(r.groups.map((g) => g.rolls)).toEqual([[6, 6], [4]]);
    expect(r.total).toBe(19);
  });

  it('acepta "d20" sin número, espacios y restas', () => {
    const r = roll('d20 - 2', () => 0); // siempre 1
    expect(r.total).toBe(-1);
    expect(r.modifier).toBe(-2);
  });

  it('rechaza expresiones inválidas', () => {
    expect(() => roll('2x6')).toThrow(DiceError);
    expect(() => roll('')).toThrow(DiceError);
    expect(() => roll('1000d6')).toThrow(DiceError);
    expect(() => roll('2d6 3')).toThrow(DiceError);
  });
});

describe('rollD20', () => {
  it('normal, ventaja y desventaja', () => {
    expect(rollD20(3, 'normal', () => 0.5).total).toBe(14);
    let n = 0;
    const alternating = () => [0.1, 0.9][n++ % 2]; // 3 y 19
    expect(rollD20(0, 'advantage', alternating).natural).toBe(19);
    expect(rollD20(0, 'disadvantage', alternating).natural).toBe(3);
  });
});
