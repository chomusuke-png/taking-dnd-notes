// Convierte los JSON de 5e-bits/5e-database (SRD 2014, inglés) al formato compacto de la app.
// Sin dependencias en tiempo de ejecución: lo usan tanto scripts/build-srd.ts como los tests.

import type { SrdCondition, SrdItem, SrdMonster, SrdMonsterAction, SrdNamedText, SrdSpell } from './types.ts';

type Raw = Record<string, any>;

const text = (v: unknown): string => (Array.isArray(v) ? v.join('\n\n') : typeof v === 'string' ? v : '');
const nonEmpty = (s: string | undefined) => (s && s.trim() ? s : undefined);
const nameList = (list: Raw[] | undefined) => (list ?? []).map((x) => (typeof x === 'string' ? x : x.name)).join(', ');
const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

export function transformSpell(r: Raw): SrdSpell {
  const components = (r.components ?? []).join(', ') + (r.material ? ` (${String(r.material).replace(/\.$/, '')})` : '');
  // Según la versión del dataset, damage viene como objeto o como lista de un elemento.
  const dmg = (Array.isArray(r.damage) ? r.damage[0] : r.damage) ?? {};
  return {
    id: r.index,
    name: r.name,
    level: r.level,
    school: r.school?.index ?? '',
    castingTime: r.casting_time ?? '',
    range: r.range ?? '',
    components,
    duration: r.duration ?? '',
    concentration: !!r.concentration,
    ritual: !!r.ritual,
    classes: (r.classes ?? []).map((c: Raw) => c.index),
    desc: text(r.desc),
    higherLevel: nonEmpty(text(r.higher_level)),
    attackType: r.attack_type,
    save: r.dc ? { ability: r.dc.dc_type?.index ?? '', success: r.dc.dc_success ?? 'none' } : undefined,
    damageType: dmg.damage_type?.index,
    damageAtSlot: dmg.damage_at_slot_level,
    damageAtCharLevel: dmg.damage_at_character_level,
    healAtSlot: r.heal_at_slot_level,
  };
}

const named = (list: Raw[] | undefined): SrdNamedText[] => (list ?? []).map((x) => ({ name: x.name, desc: x.desc ?? '' }));

function monsterProficiencies(r: Raw, prefix: string): string | undefined {
  const list = (r.proficiencies ?? [])
    .filter((p: Raw) => String(p.proficiency?.index ?? '').startsWith(prefix))
    .map((p: Raw) => `${String(p.proficiency.name).replace(/^(Saving Throw|Skill): /, '')} ${signed(p.value)}`);
  return list.length ? list.join(', ') : undefined;
}

export function transformMonster(r: Raw): SrdMonster {
  const ac = (r.armor_class ?? [])[0] ?? { value: 10 };
  const acNote = ac.armor?.length ? nameList(ac.armor).toLowerCase() : ac.type && ac.type !== 'dex' ? ac.type : undefined;
  const speed = Object.entries(r.speed ?? {})
    .map(([k, v]) => (k === 'walk' ? String(v) : k === 'hover' ? 'hover' : `${k} ${v}`))
    .join(', ');
  const senses = Object.entries(r.senses ?? {})
    .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
    .join(', ');
  const actions: SrdMonsterAction[] = (r.actions ?? []).map((a: Raw) => ({
    name: a.name,
    desc: a.desc ?? '',
    attackBonus: a.attack_bonus,
    damage: (a.damage ?? [])
      .filter((d: Raw) => d.damage_dice)
      .map((d: Raw) => `${d.damage_dice} ${d.damage_type?.index ?? ''}`.trim()),
  }));
  return {
    id: r.index,
    name: r.name,
    size: r.size,
    type: r.type,
    subtype: r.subtype ?? undefined,
    alignment: r.alignment ?? '',
    ac: ac.value,
    acNote,
    hp: r.hit_points,
    hitDice: r.hit_dice,
    hpRoll: r.hit_points_roll ?? r.hit_dice,
    speed,
    abilities: { str: r.strength, dex: r.dexterity, con: r.constitution, int: r.intelligence, wis: r.wisdom, cha: r.charisma },
    saves: monsterProficiencies(r, 'saving-throw-'),
    skills: monsterProficiencies(r, 'skill-'),
    vulnerabilities: nonEmpty((r.damage_vulnerabilities ?? []).join(', ')),
    resistances: nonEmpty((r.damage_resistances ?? []).join(', ')),
    immunities: nonEmpty((r.damage_immunities ?? []).join(', ')),
    conditionImmunities: nonEmpty(nameList(r.condition_immunities)),
    senses,
    languages: r.languages || '—',
    cr: r.challenge_rating,
    xp: r.xp,
    traits: named(r.special_abilities),
    actions,
    reactions: named(r.reactions),
    legendary: named(r.legendary_actions),
    desc: nonEmpty(text(r.desc)),
  };
}

const ARMOR_KIND: Record<string, 'light' | 'medium' | 'heavy' | 'shield'> = {
  Light: 'light', Medium: 'medium', Heavy: 'heavy', Shield: 'shield',
};

export function transformEquipment(r: Raw): SrdItem {
  const cat = r.equipment_category?.index;
  const cost = r.cost ? `${r.cost.quantity} ${r.cost.unit}` : undefined;
  const base = { id: r.index, name: r.name, cost, weight: r.weight || undefined, desc: nonEmpty(text(r.desc)) };

  if (cat === 'weapon') {
    const props = (r.properties ?? []).map((p: Raw) => p.index);
    const range = r.range?.long ? `${r.range.normal}/${r.range.long} ft.` : r.throw_range ? `${r.throw_range.normal}/${r.throw_range.long} ft.` : undefined;
    return {
      ...base,
      category: 'weapon',
      sub: r.category_range,
      weapon: {
        simple: r.weapon_category === 'Simple',
        ranged: r.weapon_range === 'Ranged',
        damage: r.damage?.damage_dice ?? '',
        damageType: r.damage?.damage_type?.index ?? '',
        properties: props,
        range,
        versatile: r.two_handed_damage?.damage_dice,
      },
    };
  }
  if (cat === 'armor') {
    return {
      ...base,
      category: 'armor',
      sub: r.armor_category,
      armor: {
        kind: ARMOR_KIND[r.armor_category] ?? 'light',
        base: r.armor_class?.base ?? 0,
        strMin: r.str_minimum || undefined,
        stealthDisadvantage: !!r.stealth_disadvantage,
      },
    };
  }
  if (cat === 'tools') return { ...base, category: 'tool', sub: r.tool_category };
  if (cat === 'mounts-and-vehicles') return { ...base, category: 'mount', sub: r.vehicle_category };
  return { ...base, category: 'gear', sub: r.gear_category?.name };
}

export function transformMagicItem(r: Raw): SrdItem {
  const desc = text(r.desc);
  const firstLine = desc.split('\n')[0] ?? '';
  return {
    id: `magic-${r.index}`,
    name: r.name,
    category: 'magic',
    sub: r.equipment_category?.name,
    rarity: r.rarity?.name,
    attunement: /requires attunement/i.test(firstLine),
    desc: nonEmpty(desc),
  };
}

export function transformCondition(r: Raw): SrdCondition {
  return { id: r.index, name: r.name, desc: text(r.desc) };
}
