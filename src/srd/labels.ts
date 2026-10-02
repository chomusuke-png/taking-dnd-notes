// Etiquetas en español para los valores enumerados del SRD. Los nombres y descripciones
// de conjuros, monstruos y objetos se mantienen en inglés (DESIGN.md §2).

export const SCHOOL_LABEL: Record<string, string> = {
  abjuration: 'Abjuración',
  conjuration: 'Conjuración',
  divination: 'Adivinación',
  enchantment: 'Encantamiento',
  evocation: 'Evocación',
  illusion: 'Ilusión',
  necromancy: 'Nigromancia',
  transmutation: 'Transmutación',
};

export const DAMAGE_TYPE_LABEL: Record<string, string> = {
  acid: 'ácido',
  bludgeoning: 'contundente',
  cold: 'frío',
  fire: 'fuego',
  force: 'fuerza',
  lightning: 'relámpago',
  necrotic: 'necrótico',
  piercing: 'perforante',
  poison: 'veneno',
  psychic: 'psíquico',
  radiant: 'radiante',
  slashing: 'cortante',
  thunder: 'trueno',
};

export const SIZE_LABEL: Record<string, string> = {
  Tiny: 'Diminuto',
  Small: 'Pequeño',
  Medium: 'Mediano',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Gargantuesco',
};

export const MONSTER_TYPE_LABEL: Record<string, string> = {
  aberration: 'Aberración',
  beast: 'Bestia',
  celestial: 'Celestial',
  construct: 'Constructo',
  dragon: 'Dragón',
  elemental: 'Elemental',
  fey: 'Feérico',
  fiend: 'Infernal',
  giant: 'Gigante',
  humanoid: 'Humanoide',
  monstrosity: 'Monstruosidad',
  ooze: 'Cieno',
  plant: 'Planta',
  'swarm of Tiny beasts': 'Enjambre',
  undead: 'No muerto',
};

export const ITEM_CATEGORY_LABEL: Record<string, string> = {
  weapon: 'Armas',
  armor: 'Armaduras',
  gear: 'Equipo',
  tool: 'Herramientas',
  mount: 'Monturas y vehículos',
  magic: 'Objetos mágicos',
};

export const RARITY_LABEL: Record<string, string> = {
  Common: 'Común',
  Uncommon: 'Infrecuente',
  Rare: 'Raro',
  'Very Rare': 'Muy raro',
  Legendary: 'Legendario',
  Artifact: 'Artefacto',
  Varies: 'Variable',
};

export const WEAPON_PROPERTY_LABEL: Record<string, string> = {
  ammunition: 'munición',
  finesse: 'sutil',
  heavy: 'pesada',
  light: 'ligera',
  loading: 'recarga',
  monk: 'monje',
  reach: 'alcance',
  special: 'especial',
  thrown: 'arrojadiza',
  'two-handed': 'a dos manos',
  versatile: 'versátil',
};

export const SAVE_ABILITY_LABEL: Record<string, string> = {
  str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR',
};

export const SPELL_LEVEL_LABEL = (level: number) => (level === 0 ? 'Truco' : `Nivel ${level}`);

/** 0.125 → "1/8" */
export function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

export const label = (dict: Record<string, string>, key: string | undefined) => (key ? dict[key] ?? key : '');
