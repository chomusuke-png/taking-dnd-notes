import { getClass } from '../rules/classes';
import { averageHp } from '../rules/derive';
import { db as defaultDb, type AppDB } from './db';
import { newCharacter } from './factories';
import { relabelInCampaign } from './notes';
import type { Character, Id } from './types';

export interface NewCharacterInput {
  name: string;
  kind: Character['kind'];
  classId?: string;
  level?: number;
}

/** Crea un personaje; si trae clase, aplica sus salvaciones y PG promedio. */
export async function createCharacter(
  campaignId: Id,
  input: NewCharacterInput,
  database: AppDB = defaultDb,
): Promise<Character> {
  if (!input.name.trim()) throw new Error('El personaje necesita un nombre.');
  const c = newCharacter(campaignId, input);
  const info = input.classId ? getClass(input.classId) : undefined;
  if (info) {
    c.classes = [{ classId: info.id, level: Math.min(20, Math.max(1, input.level ?? 1)), hitDie: info.hitDie }];
    c.proficiencies.saves = [...info.saves];
    c.hp.max = c.hp.current = averageHp(c);
  }
  await database.transaction('rw', database.characters, database.campaigns, async () => {
    await database.characters.add(c);
    await database.campaigns.update(campaignId, { updatedAt: Date.now() });
  });
  return c;
}

/**
 * Actualiza un personaje leyendo la versión más reciente dentro de una transacción,
 * así dos cambios seguidos (p. ej. dos clics rápidos) no se pisan entre sí.
 */
export async function updateCharacter(
  id: Id,
  change: (c: Character) => Character,
  database: AppDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.characters, database.campaigns, database.notes, async () => {
    const current = await database.characters.get(id);
    if (!current) return;
    const now = Date.now();
    const next = { ...change(current), id, updatedAt: now };
    await database.characters.put(next);
    // Las menciones [[...]] en las notas muestran el nombre actual del personaje.
    if (next.name !== current.name) await relabelInCampaign(current.campaignId, id, next.name, database);
    await database.campaigns.update(current.campaignId, { updatedAt: now });
  });
}

/** Elimina el personaje y suelta la referencia desde su ficha wiki, si la tiene. */
export async function deleteCharacter(id: Id, database: AppDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.characters, database.notes, async () => {
    const c = await database.characters.get(id);
    if (!c) return;
    await database.notes
      .where('campaignId')
      .equals(c.campaignId)
      .filter((n) => n.characterId === id)
      .modify((n) => {
        delete n.characterId;
      });
    await database.characters.delete(id);
  });
}
