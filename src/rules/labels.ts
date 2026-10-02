import type { Ability, Condition, Recharge, Skill } from '../db/types';

export const ABILITY_LABEL: Record<Ability, { short: string; long: string }> = {
  str: { short: 'FUE', long: 'Fuerza' },
  dex: { short: 'DES', long: 'Destreza' },
  con: { short: 'CON', long: 'Constitución' },
  int: { short: 'INT', long: 'Inteligencia' },
  wis: { short: 'SAB', long: 'Sabiduría' },
  cha: { short: 'CAR', long: 'Carisma' },
};

export const SKILL_LABEL: Record<Skill, string> = {
  acrobatics: 'Acrobacias',
  animalHandling: 'Trato con animales',
  arcana: 'Arcanos',
  athletics: 'Atletismo',
  deception: 'Engaño',
  history: 'Historia',
  insight: 'Perspicacia',
  intimidation: 'Intimidación',
  investigation: 'Investigación',
  medicine: 'Medicina',
  nature: 'Naturaleza',
  perception: 'Percepción',
  performance: 'Interpretación',
  persuasion: 'Persuasión',
  religion: 'Religión',
  sleightOfHand: 'Juego de manos',
  stealth: 'Sigilo',
  survival: 'Supervivencia',
};

export const CONDITION_LABEL: Record<Condition, string> = {
  blinded: 'Cegado',
  charmed: 'Hechizado',
  deafened: 'Ensordecido',
  frightened: 'Asustado',
  grappled: 'Agarrado',
  incapacitated: 'Incapacitado',
  invisible: 'Invisible',
  paralyzed: 'Paralizado',
  petrified: 'Petrificado',
  poisoned: 'Envenenado',
  prone: 'Derribado',
  restrained: 'Apresado',
  stunned: 'Aturdido',
  unconscious: 'Inconsciente',
};

export const RECHARGE_LABEL: Record<Recharge, string> = {
  short: 'Descanso corto',
  long: 'Descanso largo',
  dawn: 'Al amanecer',
};

/** Efectos acumulativos del agotamiento (PHB p. 291), por nivel. */
export const EXHAUSTION_EFFECTS = [
  'Sin agotamiento',
  'Desventaja en pruebas de característica',
  'Velocidad reducida a la mitad',
  'Desventaja en ataques y salvaciones',
  'PG máximos reducidos a la mitad',
  'Velocidad reducida a 0',
  'Muerte',
];
