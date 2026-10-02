import { newId } from '../lib/id';
import { db as defaultDb, type AppDB } from './db';
import type { Encounter, Id } from './types';

export async function createEncounter(campaignId: Id, name: string, database: AppDB = defaultDb): Promise<Encounter> {
  const now = Date.now();
  const count = await database.encounters.where('campaignId').equals(campaignId).count();
  const enc: Encounter = {
    id: newId(),
    campaignId,
    name: name.trim() || `Encuentro ${count + 1}`,
    round: 0,
    ended: false,
    combatants: [],
    createdAt: now,
    updatedAt: now,
  };
  await database.encounters.add(enc);
  return enc;
}

/** Aplica un cambio sobre la versión más reciente del encuentro (dentro de una transacción). */
export async function updateEncounter(
  id: Id,
  change: (e: Encounter) => Encounter,
  database: AppDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.encounters, async () => {
    const current = await database.encounters.get(id);
    if (!current) return;
    await database.encounters.put({ ...change(current), id, updatedAt: Date.now() });
  });
}

export async function deleteEncounter(id: Id, database: AppDB = defaultDb): Promise<void> {
  await database.encounters.delete(id);
}

/** Copia el encuentro en preparación (mismos combatientes, sin iniciativa ni daño). */
export async function duplicateEncounter(id: Id, database: AppDB = defaultDb): Promise<Encounter | undefined> {
  const src = await database.encounters.get(id);
  if (!src) return undefined;
  const now = Date.now();
  const copy: Encounter = {
    ...src,
    id: newId(),
    name: `${src.name} (copia)`,
    round: 0,
    activeId: undefined,
    ended: false,
    combatants: src.combatants.map((cb) => ({ ...cb, id: newId(), initiative: null, hp: cb.maxHp, tempHp: 0, conditions: [] })),
    createdAt: now,
    updatedAt: now,
  };
  await database.encounters.add(copy);
  return copy;
}
