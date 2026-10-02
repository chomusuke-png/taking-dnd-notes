import type { Ability, Attack, Character, HitDie, Skill } from '../db/types';
import { casterOf, getClass } from './classes';

export const SKILL_ABILITY: Record<Skill, Ability> = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
};

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

/** +3, −1, +0 (con signo menos tipográfico). */
export const formatMod = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

export const totalLevel = (c: Pick<Character, 'classes'>): number =>
  c.classes.reduce((sum, cls) => sum + cls.level, 0);

export const proficiencyBonus = (level: number): number => 2 + Math.floor((Math.max(level, 1) - 1) / 4);

export const profOf = (c: Character): number => proficiencyBonus(totalLevel(c));

export const mod = (c: Character, ability: Ability): number => abilityMod(c.abilities[ability]);

export function saveBonus(c: Character, ability: Ability): number {
  const prof = c.proficiencies.saves.includes(ability) ? profOf(c) : 0;
  return mod(c, ability) + prof + c.bonuses.saves;
}

/** Multiplicador de competencia efectivo: pericia 2, competente 1, Jack of all trades ½. */
export function skillProficiency(c: Character, skill: Skill): number {
  const level = c.proficiencies.skills[skill] ?? 0;
  if (level === 0 && c.proficiencies.jackOfAllTrades) return 0.5;
  return level;
}

export function skillBonus(c: Character, skill: Skill): number {
  return mod(c, SKILL_ABILITY[skill]) + Math.floor(profOf(c) * skillProficiency(c, skill));
}

export const passiveScore = (c: Character, skill: Skill): number => 10 + skillBonus(c, skill);

/** Jack of all trades también aplica a la iniciativa (es una prueba de Destreza). */
export function initiative(c: Character): number {
  const joat = c.proficiencies.jackOfAllTrades ? Math.floor(profOf(c) / 2) : 0;
  return mod(c, 'dex') + joat + c.bonuses.initiative;
}

export function armorClass(c: Character): number {
  if (c.acOverride !== undefined) return c.acOverride;
  const { kind, base, shield, unarmoredDefense, bonus } = c.armor;
  const dex = mod(c, 'dex');
  let ac: number;
  switch (kind) {
    case 'light':
    case 'natural':
      ac = base + dex;
      break;
    case 'medium':
      ac = base + Math.min(dex, 2);
      break;
    case 'heavy':
      ac = base;
      break;
    default:
      if (unarmoredDefense === 'barbarian') ac = 10 + dex + mod(c, 'con');
      // La Defensa sin armadura del monje no funciona con escudo.
      else if (unarmoredDefense === 'monk' && !shield) ac = 10 + dex + mod(c, 'wis');
      else ac = 10 + dex;
  }
  return ac + (shield ? 2 : 0) + bonus;
}

export interface SpellcastingStats {
  classId: string;
  ability: Ability;
  saveDc: number;
  attack: number;
}

/** CD y ataque de conjuros por cada clase lanzadora (pueden diferir al multiclasear). */
export function spellcastingStats(c: Character): SpellcastingStats[] {
  const prof = profOf(c);
  const seen = new Set<Ability>();
  const out: SpellcastingStats[] = [];
  for (const cls of c.classes) {
    const { caster, spellAbility } = casterOf(cls);
    if (caster === 'none' || !spellAbility || seen.has(spellAbility)) continue;
    seen.add(spellAbility);
    const m = mod(c, spellAbility);
    out.push({
      classId: cls.classId,
      ability: spellAbility,
      saveDc: 8 + prof + m + c.bonuses.spellDc,
      attack: prof + m + c.bonuses.spellAttack,
    });
  }
  return out;
}

export function attackBonus(c: Character, a: Attack): number {
  return mod(c, a.ability) + (a.proficient ? profOf(c) : 0) + a.bonus;
}

/** Expresión de daño con el modificador ya sumado: "1d8+3". */
export function damageExpression(c: Character, a: Attack): string {
  const extra = mod(c, a.ability) + a.bonus;
  if (!a.damage.trim()) return '';
  return extra === 0 ? a.damage : `${a.damage}${extra > 0 ? '+' : '-'}${Math.abs(extra)}`;
}

/** Dados de golpe totales por tipo de dado, según las clases. */
export function hitDiceTotals(c: Pick<Character, 'classes'>): Partial<Record<HitDie, number>> {
  const totals: Partial<Record<HitDie, number>> = {};
  for (const cls of c.classes) totals[cls.hitDie] = (totals[cls.hitDie] ?? 0) + cls.level;
  return totals;
}

/**
 * PG máximos con el valor fijo por nivel (PHB p. 15): máximo del dado en nivel 1 de la
 * primera clase y luego la media redondeada hacia arriba; + CON por nivel.
 */
export function averageHp(c: Character): number {
  const con = mod(c, 'con');
  let hp = 0;
  c.classes.forEach((cls, i) => {
    for (let lvl = 0; lvl < cls.level; lvl++) {
      hp += (i === 0 && lvl === 0 ? cls.hitDie : cls.hitDie / 2 + 1) + con;
    }
  });
  return Math.max(hp, totalLevel(c));
}

export const savingThrowsForClass = (classId: string): Ability[] => getClass(classId)?.saves ?? [];

export function carryingCapacity(c: Character): number {
  return c.abilities.str * 15;
}

/** Peso total del inventario; 50 monedas pesan 1 libra (PHB p. 143). */
export function inventoryWeight(c: Character): number {
  const items = c.inventory.reduce((sum, it) => sum + it.weight * it.qty, 0);
  const coins = Object.values(c.currency).reduce((sum, n) => sum + n, 0) / 50;
  return Math.round((items + coins) * 100) / 100;
}

/** Regla variante de carga (PHB p. 176). */
export function encumbrance(c: Character): 'normal' | 'encumbered' | 'heavily' | 'over' {
  const w = inventoryWeight(c);
  const str = c.abilities.str;
  if (w > str * 15) return 'over';
  if (w > str * 10) return 'heavily';
  if (w > str * 5) return 'encumbered';
  return 'normal';
}

