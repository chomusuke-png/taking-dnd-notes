import { newCharacter } from './factories';
import type { Character } from './types';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Completa recursivamente los campos que falten en `value` con los de `defaults`. */
function withDefaults<T>(defaults: T, value: unknown): T {
  if (!isObject(defaults) || !isObject(value)) return value === undefined ? defaults : (value as T);
  const out: Record<string, unknown> = { ...value };
  for (const [key, def] of Object.entries(defaults)) out[key] = withDefaults(def, value[key]);
  return out as T;
}

/**
 * Lleva un personaje guardado con una versión anterior del modelo a la forma actual.
 * Se usa al migrar la base de datos y al importar respaldos.
 */
export function normalizeCharacter(raw: Character): Character {
  const defaults = newCharacter(raw.campaignId, { name: raw.name ?? '' });
  const c = withDefaults(defaults, raw);
  // Valores heredados del modelo F0: la competencia 0.5 (Jack of all trades) pasó a ser un flag.
  const skills = c.proficiencies.skills as Record<string, number>;
  for (const [skill, level] of Object.entries(skills)) {
    if (level === 0.5) {
      delete skills[skill];
      c.proficiencies.jackOfAllTrades = true;
    }
  }
  // v3 (F3): los objetos guardan su nombre visible.
  c.inventory = c.inventory.map((it) => ({ ...it, name: it.name ?? ('custom' in it.item ? it.item.custom : it.item.id) }));
  const used = c.spellcasting.slotsUsed;
  c.spellcasting.slotsUsed = Array.from({ length: 9 }, (_, i) => used[i] ?? 0);
  return c;
}
