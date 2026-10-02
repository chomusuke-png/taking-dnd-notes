import { fold } from '../lib/text';
import type { ArmorConfig, Attack, Character, InventoryItem } from '../db/types';
import { newId } from '../lib/id';
import { DAMAGE_TYPE_LABEL } from '../srd/labels';
import type { SrdItem } from '../srd/types';
import { abilityMod } from './derive';

export function inventoryFromSrd(item: SrdItem, qty = 1): InventoryItem {
  return {
    id: newId(),
    item: { source: 'srd', id: item.id },
    name: item.name,
    qty,
    weight: item.weight ?? 0,
    equipped: false,
    attuned: false,
    notes: '',
  };
}

/**
 * ¿Es competente con el arma? Se deduce de la lista de competencias escrita a mano
 * ("Sencillas, marciales", "Simple weapons", "Longsword"...). Si la lista está vacía,
 * se asume que sí para no penalizar a quien aún no la completó.
 */
export function isProficientWith(c: Character, item: SrdItem): boolean {
  const list = c.proficiencies.weapons.map(fold);
  if (list.length === 0 || !item.weapon) return true;
  const name = fold(item.name);
  return list.some((p) =>
    item.weapon!.simple ? /sencill|simple/.test(p) || name.includes(p) : /marcial|martial/.test(p) || name.includes(p),
  );
}

/** Ataque para la hoja a partir de un arma del SRD: sutil usa la mejor de FUE/DES; a distancia, DES. */
export function attackFromWeapon(c: Character, item: SrdItem): Attack | undefined {
  const w = item.weapon;
  if (!w) return undefined;
  const str = abilityMod(c.abilities.str);
  const dex = abilityMod(c.abilities.dex);
  const ability = w.ranged ? 'dex' : w.properties.includes('finesse') && dex > str ? 'dex' : 'str';
  return {
    id: newId(),
    name: item.name,
    ability,
    proficient: isProficientWith(c, item),
    damage: w.damage,
    damageType: DAMAGE_TYPE_LABEL[w.damageType] ?? w.damageType,
    bonus: 0,
  };
}

/** Configuración de CA al equipar una armadura o un escudo del SRD. */
export function armorFromItem(current: ArmorConfig, item: SrdItem): ArmorConfig | undefined {
  const a = item.armor;
  if (!a) return undefined;
  if (a.kind === 'shield') return { ...current, shield: true };
  return { ...current, kind: a.kind, base: a.base };
}
