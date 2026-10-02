// Formato compacto del SRD 5.1 que usa la app (generado por scripts/build-srd.ts).

export interface SrdSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  classes: string[];
  desc: string;
  higherLevel?: string;
  attackType?: 'melee' | 'ranged';
  save?: { ability: string; success: string };
  damageType?: string;
  /** Daño por nivel de espacio ("3" → "8d6"). */
  damageAtSlot?: Record<string, string>;
  /** Daño de trucos por nivel de personaje ("5" → "2d10"). */
  damageAtCharLevel?: Record<string, string>;
  healAtSlot?: Record<string, string>;
}

export interface SrdNamedText {
  name: string;
  desc: string;
}

export interface SrdMonsterAction extends SrdNamedText {
  attackBonus?: number;
  damage?: string[];
}

export interface SrdMonster {
  id: string;
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  ac: number;
  acNote?: string;
  hp: number;
  hitDice: string;
  hpRoll: string;
  speed: string;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  saves?: string;
  skills?: string;
  vulnerabilities?: string;
  resistances?: string;
  immunities?: string;
  conditionImmunities?: string;
  senses: string;
  languages: string;
  cr: number;
  xp: number;
  traits: SrdNamedText[];
  actions: SrdMonsterAction[];
  reactions: SrdNamedText[];
  legendary: SrdNamedText[];
  desc?: string;
}

export type SrdItemCategory = 'weapon' | 'armor' | 'gear' | 'tool' | 'mount' | 'magic';

export interface SrdItem {
  id: string;
  name: string;
  category: SrdItemCategory;
  /** Subcategoría legible ("Martial Melee", "Heavy", "Wondrous Items"...). */
  sub?: string;
  cost?: string;
  weight?: number;
  desc?: string;
  weapon?: {
    simple: boolean;
    ranged: boolean;
    damage: string;
    damageType: string;
    properties: string[];
    range?: string;
    versatile?: string;
  };
  armor?: {
    kind: 'light' | 'medium' | 'heavy' | 'shield';
    base: number;
    strMin?: number;
    stealthDisadvantage: boolean;
  };
  rarity?: string;
  attunement?: boolean;
}

export interface SrdCondition {
  id: string;
  name: string;
  desc: string;
}
