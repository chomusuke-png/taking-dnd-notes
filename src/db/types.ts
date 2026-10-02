// Modelo de datos persistido. Solo se guardan decisiones del usuario;
// todo lo derivado (modificadores, CA, CD...) lo calcula src/rules.

export type Id = string;

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const SKILLS = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival',
] as const;
export type Skill = (typeof SKILLS)[number];

/** 0 = nada, 1 = competente, 2 = pericia. Jack of all trades es un flag del personaje. */
export type ProficiencyLevel = 0 | 1 | 2;

export const CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
  'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
  'stunned', 'unconscious',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type HitDie = 6 | 8 | 10 | 12;
export type Recharge = 'short' | 'long' | 'dawn';

/**
 * Cómo se calcula la CA. 'none' usa 10 + DES o la Defensa sin armadura indicada;
 * 'natural' es base + DES (p. ej. hombre lagarto 13 + DES).
 */
export interface ArmorConfig {
  kind: 'none' | 'light' | 'medium' | 'heavy' | 'natural';
  base: number;
  shield: boolean;
  unarmoredDefense: 'none' | 'barbarian' | 'monk';
  /** Bonificadores mágicos o de rasgos (+1 armadura, Defensa del estilo de combate...). */
  bonus: number;
}

/** Bonificadores varios de objetos o rasgos (Anillo de protección, Alerta...). */
export interface MiscBonuses {
  initiative: number;
  saves: number;
  spellDc: number;
  spellAttack: number;
}

/** Referencia a una entrada del SRD o a una entrada homebrew de la campaña. */
export interface EntryRef {
  source: 'srd' | 'custom';
  id: string;
}

export interface CampaignSettings {
  variantEncumbrance: boolean;
}

export interface Campaign {
  id: Id;
  name: string;
  description: string;
  settings: CampaignSettings;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterClass {
  classId: string;
  subclassId?: string;
  level: number;
  hitDie: HitDie;
}

export interface SpellcastingEntry {
  classId: string;
  ability: Ability;
  known: EntryRef[];
  prepared: EntryRef[];
}

export interface InventoryItem {
  id: Id;
  item: EntryRef | { custom: string };
  qty: number;
  equipped: boolean;
  attuned: boolean;
  weight: number;
  notes: string;
}

export interface Feature {
  id: Id;
  name: string;
  source: string;
  description: string;
  uses?: { max: number; used: number; recharge: Recharge };
}

export interface Attack {
  id: Id;
  name: string;
  ability: Ability;
  proficient: boolean;
  damage: string;
  damageType: string;
  bonus: number;
}

export interface Character {
  id: Id;
  campaignId: Id;
  kind: 'pc' | 'npc';
  name: string;
  player: string;
  race: string;
  subrace: string;
  background: string;
  alignment: string;
  classes: CharacterClass[];
  abilities: Record<Ability, number>;
  proficiencies: {
    saves: Ability[];
    skills: Partial<Record<Skill, ProficiencyLevel>>;
    jackOfAllTrades: boolean;
    armor: string[];
    weapons: string[];
    tools: string[];
    languages: string[];
  };
  hp: { max: number; current: number; temp: number };
  hitDiceUsed: Partial<Record<HitDie, number>>;
  deathSaves: { success: number; fail: number };
  conditions: Condition[];
  exhaustion: number;
  inspiration: boolean;
  speed: number;
  armor: ArmorConfig;
  acOverride?: number;
  bonuses: MiscBonuses;
  spellcasting: {
    entries: SpellcastingEntry[];
    /** Espacios gastados por nivel de conjuro (índice 0 = nivel 1). */
    slotsUsed: number[];
    pactSlotsUsed: number;
  };
  inventory: InventoryItem[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  features: Feature[];
  attacks: Attack[];
  noteId?: Id;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_TYPES = ['session', 'npc', 'location', 'quest', 'faction', 'item', 'free'] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export interface Note {
  id: Id;
  campaignId: Id;
  type: NoteType;
  title: string;
  aliases: string[];
  /** Documento TipTap (JSON de ProseMirror). */
  content: unknown;
  tags: string[];
  session?: { number: number; date: string; xp?: number; loot?: string };
  quest?: { status: 'active' | 'done' | 'failed' };
  characterId?: Id;
  /** Ids de notas/personajes enlazados con [[...]]; derivado al guardar, alimenta los backlinks. */
  links: Id[];
  createdAt: number;
  updatedAt: number;
}

export interface Combatant {
  id: Id;
  ref: { type: 'character'; id: Id } | { type: 'srdMonster'; id: string } | { type: 'custom' };
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: Condition[];
  hidden: boolean;
}

export interface Encounter {
  id: Id;
  campaignId: Id;
  name: string;
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomEntry {
  id: Id;
  campaignId: Id;
  kind: 'spell' | 'item' | 'monster' | 'feat';
  name: string;
  data: unknown;
  createdAt: number;
  updatedAt: number;
}
