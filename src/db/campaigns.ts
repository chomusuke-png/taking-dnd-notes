import { CAMPAIGN_TABLES, db as defaultDb, type AppDB } from './db';
import { newCampaign } from './factories';
import type { Campaign, Id } from './types';

export async function createCampaign(
  input: { name: string; description?: string },
  database: AppDB = defaultDb,
): Promise<Campaign> {
  if (!input.name.trim()) throw new Error('La campaña necesita un nombre.');
  const campaign = newCampaign(input);
  await database.campaigns.add(campaign);
  return campaign;
}

export async function updateCampaign(
  id: Id,
  changes: Partial<Pick<Campaign, 'name' | 'description' | 'settings'>>,
  database: AppDB = defaultDb,
): Promise<void> {
  if (changes.name !== undefined && !changes.name.trim()) throw new Error('La campaña necesita un nombre.');
  await database.campaigns.update(id, { ...changes, updatedAt: Date.now() });
}

/** Elimina la campaña y todo su contenido. */
export async function deleteCampaign(id: Id, database: AppDB = defaultDb): Promise<void> {
  const tables = CAMPAIGN_TABLES.map((t) => database[t]);
  await database.transaction('rw', [database.campaigns, ...tables], async () => {
    await Promise.all(tables.map((t) => t.where('campaignId').equals(id).delete()));
    await database.campaigns.delete(id);
  });
}

export interface CampaignCounts {
  characters: number;
  notes: number;
  encounters: number;
}

export async function countCampaignContent(id: Id, database: AppDB = defaultDb): Promise<CampaignCounts> {
  const [characters, notes, encounters] = await Promise.all([
    database.characters.where('campaignId').equals(id).count(),
    database.notes.where('campaignId').equals(id).count(),
    database.encounters.where('campaignId').equals(id).count(),
  ]);
  return { characters, notes, encounters };
}
