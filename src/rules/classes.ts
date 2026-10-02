import type { Ability, CharacterClass, HitDie } from '../db/types';

/**
 * full = lanzador completo, half = medio (redondea hacia abajo al multiclasear),
 * halfUp = artífice (redondea hacia arriba), third = un tercio, pact = Magia de pacto.
 */
export type CasterType = 'none' | 'full' | 'half' | 'halfUp' | 'third' | 'pact';

export interface ClassInfo {
  id: string;
  name: string;
  hitDie: HitDie;
  saves: [Ability, Ability];
  caster: CasterType;
  spellAbility?: Ability;
}

export const CLASSES: ClassInfo[] = [
  { id: 'artificer', name: 'Artífice', hitDie: 8, saves: ['con', 'int'], caster: 'halfUp', spellAbility: 'int' },
  { id: 'barbarian', name: 'Bárbaro', hitDie: 12, saves: ['str', 'con'], caster: 'none' },
  { id: 'bard', name: 'Bardo', hitDie: 8, saves: ['dex', 'cha'], caster: 'full', spellAbility: 'cha' },
  { id: 'cleric', name: 'Clérigo', hitDie: 8, saves: ['wis', 'cha'], caster: 'full', spellAbility: 'wis' },
  { id: 'druid', name: 'Druida', hitDie: 8, saves: ['int', 'wis'], caster: 'full', spellAbility: 'wis' },
  { id: 'fighter', name: 'Guerrero', hitDie: 10, saves: ['str', 'con'], caster: 'none' },
  { id: 'monk', name: 'Monje', hitDie: 8, saves: ['str', 'dex'], caster: 'none' },
  { id: 'paladin', name: 'Paladín', hitDie: 10, saves: ['wis', 'cha'], caster: 'half', spellAbility: 'cha' },
  { id: 'ranger', name: 'Explorador', hitDie: 10, saves: ['str', 'dex'], caster: 'half', spellAbility: 'wis' },
  { id: 'rogue', name: 'Pícaro', hitDie: 8, saves: ['dex', 'int'], caster: 'none' },
  { id: 'sorcerer', name: 'Hechicero', hitDie: 6, saves: ['con', 'cha'], caster: 'full', spellAbility: 'cha' },
  { id: 'warlock', name: 'Brujo', hitDie: 8, saves: ['wis', 'cha'], caster: 'pact', spellAbility: 'cha' },
  { id: 'wizard', name: 'Mago', hitDie: 6, saves: ['int', 'wis'], caster: 'full', spellAbility: 'int' },
];

/** Subclases que convierten en lanzador a una clase que no lo es. */
export const CASTER_SUBCLASSES: Record<string, { name: string; classId: string; caster: CasterType; spellAbility: Ability }> = {
  'eldritch-knight': { name: 'Caballero arcano', classId: 'fighter', caster: 'third', spellAbility: 'int' },
  'arcane-trickster': { name: 'Embaucador arcano', classId: 'rogue', caster: 'third', spellAbility: 'int' },
};

const BY_ID = new Map(CLASSES.map((c) => [c.id, c]));

export function getClass(classId: string): ClassInfo | undefined {
  return BY_ID.get(classId);
}

export function className(cls: CharacterClass): string {
  const base = getClass(cls.classId)?.name ?? cls.classId;
  const sub = cls.subclassId ? CASTER_SUBCLASSES[cls.subclassId]?.name ?? cls.subclassId : '';
  return sub ? `${base} (${sub})` : base;
}

/** Tipo de lanzador y característica de una clase concreta del personaje, considerando la subclase. */
export function casterOf(cls: CharacterClass): { caster: CasterType; spellAbility?: Ability } {
  const sub = cls.subclassId ? CASTER_SUBCLASSES[cls.subclassId] : undefined;
  if (sub && sub.classId === cls.classId) return { caster: sub.caster, spellAbility: sub.spellAbility };
  const info = getClass(cls.classId);
  return { caster: info?.caster ?? 'none', spellAbility: info?.spellAbility };
}
