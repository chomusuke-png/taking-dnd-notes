import type { Character, CharacterClass, SpellcastingEntry } from '../db/types';
import type { SrdSpell } from '../srd/types';
import { CASTER_SUBCLASSES, casterOf, getClass } from './classes';
import { abilityMod, totalLevel } from './derive';
import { pactSlots, spellSlots } from './spellSlots';

/** Lista de conjuros de la que elige una clase (Caballero/Embaucador arcano usan la del mago). */
export function spellListClass(cls: CharacterClass): string {
  const sub = cls.subclassId ? CASTER_SUBCLASSES[cls.subclassId] : undefined;
  return sub && sub.classId === cls.classId ? 'wizard' : cls.classId;
}

/** Clases del personaje que lanzan conjuros (excluye guerrero o pícaro sin subclase arcana). */
export const casterClasses = (c: Character): CharacterClass[] =>
  c.classes.filter((cls) => casterOf(cls).caster !== 'none');

/** Conjuros preparados permitidos (PHB): mod + nivel, o mod + mitad del nivel para paladín y artífice. Mínimo 1. */
export function preparedLimit(c: Character, cls: CharacterClass): number | undefined {
  const info = getClass(cls.classId);
  const { spellAbility } = casterOf(cls);
  if (!info?.prepares || !spellAbility) return undefined;
  const half = cls.classId === 'paladin' || cls.classId === 'artificer';
  return Math.max(1, abilityMod(c.abilities[spellAbility]) + (half ? Math.floor(cls.level / 2) : cls.level));
}

function entryFor(c: Character, classId: string): SpellcastingEntry {
  const existing = c.spellcasting.entries.find((e) => e.classId === classId);
  if (existing) return existing;
  const cls = c.classes.find((x) => x.classId === classId);
  return { classId, ability: (cls && casterOf(cls).spellAbility) ?? 'int', known: [], prepared: [] };
}

function withEntry(c: Character, entry: SpellcastingEntry): Character {
  const others = c.spellcasting.entries.filter((e) => e.classId !== entry.classId);
  return { ...c, spellcasting: { ...c.spellcasting, entries: [...others, entry] } };
}

export function addSpell(c: Character, classId: string, spellId: string): Character {
  const entry = entryFor(c, classId);
  if (entry.known.some((r) => r.id === spellId)) return c;
  return withEntry(c, { ...entry, known: [...entry.known, { source: 'srd', id: spellId }] });
}

export function removeSpell(c: Character, classId: string, spellId: string): Character {
  const entry = entryFor(c, classId);
  return withEntry(c, {
    ...entry,
    known: entry.known.filter((r) => r.id !== spellId),
    prepared: entry.prepared.filter((r) => r.id !== spellId),
  });
}

export function togglePrepared(c: Character, classId: string, spellId: string): Character {
  const entry = entryFor(c, classId);
  const isPrepared = entry.prepared.some((r) => r.id === spellId);
  return withEntry(c, {
    ...entry,
    prepared: isPrepared ? entry.prepared.filter((r) => r.id !== spellId) : [...entry.prepared, { source: 'srd', id: spellId }],
  });
}

export interface CastOption {
  level: number;
  kind: 'slot' | 'pact';
  available: number;
}

/** Espacios con los que se puede lanzar un conjuro del nivel dado (vacío para trucos). */
export function castOptions(c: Character, spellLevel: number): CastOption[] {
  if (spellLevel === 0) return [];
  const opts: CastOption[] = [];
  spellSlots(c.classes).forEach((max, i) => {
    const level = i + 1;
    if (max > 0 && level >= spellLevel) opts.push({ level, kind: 'slot', available: max - (c.spellcasting.slotsUsed[i] ?? 0) });
  });
  const pact = pactSlots(c.classes);
  if (pact.count > 0 && pact.level >= spellLevel) {
    opts.push({ level: pact.level, kind: 'pact', available: pact.count - c.spellcasting.pactSlotsUsed });
  }
  return opts;
}

export function spendSlot(c: Character, opt: Pick<CastOption, 'level' | 'kind'>): Character {
  if (opt.kind === 'pact') return { ...c, spellcasting: { ...c.spellcasting, pactSlotsUsed: c.spellcasting.pactSlotsUsed + 1 } };
  const slotsUsed = c.spellcasting.slotsUsed.map((u, i) => (i === opt.level - 1 ? u + 1 : u));
  return { ...c, spellcasting: { ...c.spellcasting, slotsUsed } };
}

/** Valor de la tabla con la clave numérica más alta que no supere `level`. */
function atLevel(table: Record<string, string> | undefined, level: number): string | undefined {
  if (!table) return undefined;
  const key = Object.keys(table)
    .map(Number)
    .filter((k) => k <= level)
    .sort((a, b) => b - a)[0];
  return key === undefined ? undefined : table[String(key)];
}

export interface SpellRoll {
  kind: 'damage' | 'heal';
  expression: string;
}

/**
 * Tirada de daño o curación de un conjuro lanzado a `castLevel` (los trucos escalan con el
 * nivel del personaje). `MOD` en las curaciones se reemplaza por el modificador de lanzamiento.
 */
export function spellRoll(spell: SrdSpell, castLevel: number, c: Character, abilityModifier: number): SpellRoll | undefined {
  const damage = spell.level === 0 ? atLevel(spell.damageAtCharLevel, totalLevel(c)) : atLevel(spell.damageAtSlot, castLevel);
  if (damage) return { kind: 'damage', expression: damage.replace(/\s+/g, '') };
  const heal = atLevel(spell.healAtSlot, castLevel);
  if (heal) {
    const mod = abilityModifier < 0 ? `-${Math.abs(abilityModifier)}` : `+${abilityModifier}`;
    return { kind: 'heal', expression: heal.replace(/\s*\+\s*MOD/i, mod).replace(/\s+/g, '') };
  }
  return undefined;
}
