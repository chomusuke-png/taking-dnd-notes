import type { CharacterClass } from '../db/types';
import { casterOf } from './classes';

/** Espacios de conjuro por nivel de lanzador (PHB p. 165), índice 0 = conjuros de nivel 1. */
const FULL_CASTER_SLOTS: number[][] = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/**
 * Nivel de lanzador efectivo para la tabla de espacios.
 * Con una sola clase lanzadora se usa la tabla propia de la clase (medio lanzador
 * desde nivel 2, un tercio desde nivel 3); con varias, la regla de multiclase (PHB p. 164).
 */
export function casterLevel(classes: CharacterClass[]): number {
  const casters = classes
    .map((c) => ({ level: c.level, caster: casterOf(c).caster }))
    .filter((c) => c.caster !== 'none' && c.caster !== 'pact');

  if (casters.length === 1) {
    const { level, caster } = casters[0];
    switch (caster) {
      case 'full': return level;
      case 'halfUp': return Math.ceil(level / 2);
      case 'half': return level >= 2 ? Math.ceil(level / 2) : 0;
      case 'third': return level >= 3 ? Math.ceil(level / 3) : 0;
    }
  }

  return casters.reduce((sum, { level, caster }) => {
    switch (caster) {
      case 'full': return sum + level;
      case 'halfUp': return sum + Math.ceil(level / 2);
      case 'half': return sum + Math.floor(level / 2);
      case 'third': return sum + Math.floor(level / 3);
      default: return sum;
    }
  }, 0);
}

/** Espacios máximos por nivel de conjuro (siempre 9 posiciones). */
export function spellSlots(classes: CharacterClass[]): number[] {
  const row = FULL_CASTER_SLOTS[Math.min(casterLevel(classes), 20)];
  return Array.from({ length: 9 }, (_, i) => row[i] ?? 0);
}

/** Magia de pacto del brujo (PHB p. 107). */
export function pactSlots(classes: CharacterClass[]): { count: number; level: number } {
  const level = classes
    .filter((c) => casterOf(c).caster === 'pact')
    .reduce((sum, c) => sum + c.level, 0);
  if (level === 0) return { count: 0, level: 0 };
  const count = level === 1 ? 1 : level <= 10 ? 2 : level <= 16 ? 3 : 4;
  const slotLevel = Math.min(5, Math.ceil(level / 2));
  return { count, level: slotLevel };
}
