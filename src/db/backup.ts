import { UUID_RE, newId } from '../lib/id';
import { db as defaultDb, type AppDB } from './db';
import type { Campaign, CampaignSettings, Character, CustomEntry, Encounter, Id, Note } from './types';

export const BACKUP_VERSION = 1;

export interface CampaignBundle {
  format: 'taking-dnd-notes-campaign';
  version: number;
  exportedAt: string;
  campaign: Campaign;
  characters: Character[];
  notes: Note[];
  encounters: Encounter[];
  customEntries: CustomEntry[];
}

export interface CharacterBundle {
  format: 'taking-dnd-notes-character';
  version: number;
  exportedAt: string;
  character: Character;
}

export class ImportError extends Error {}

export async function exportCampaign(id: Id, database: AppDB = defaultDb): Promise<CampaignBundle> {
  const campaign = await database.campaigns.get(id);
  if (!campaign) throw new Error('Campaña no encontrada.');
  const [characters, notes, encounters, customEntries] = await Promise.all([
    database.characters.where('campaignId').equals(id).toArray(),
    database.notes.where('campaignId').equals(id).toArray(),
    database.encounters.where('campaignId').equals(id).toArray(),
    database.customEntries.where('campaignId').equals(id).toArray(),
  ]);
  return {
    format: 'taking-dnd-notes-campaign',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    campaign,
    characters,
    notes,
    encounters,
    customEntries,
  };
}

export async function exportCharacter(id: Id, database: AppDB = defaultDb): Promise<CharacterBundle> {
  const character = await database.characters.get(id);
  if (!character) throw new Error('Personaje no encontrado.');
  return { format: 'taking-dnd-notes-character', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), character };
}

/**
 * Reemplaza cada UUID del objeto por uno nuevo, de forma consistente: las referencias
 * internas (campaignId, links, menciones dentro del contenido de notas...) siguen apuntando
 * a lo mismo. Los ids del SRD son slugs ("fireball"), no UUIDs, así que no se tocan.
 */
export function remapIds<T>(value: T): T {
  const map = new Map<string, string>();
  const json = JSON.stringify(value).replace(UUID_RE, (old) => {
    const key = old.toLowerCase();
    let next = map.get(key);
    if (!next) map.set(key, (next = newId()));
    return next;
  });
  return JSON.parse(json) as T;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function checkEntities(value: unknown, label: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || !value.every((e) => isObject(e) && typeof e.id === 'string')) {
    throw new ImportError(`El respaldo tiene "${label}" con formato inválido.`);
  }
}

function checkVersion(data: Record<string, unknown>): void {
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new ImportError('Este respaldo es de una versión más nueva de Taking D&D Notes. Actualiza la app para importarlo.');
  }
}

export function parseBackup(text: string): CampaignBundle | CharacterBundle {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }
  if (!isObject(data)) throw new ImportError('El archivo no es un respaldo de Taking D&D Notes.');

  if (data.format === 'taking-dnd-notes-campaign') {
    checkVersion(data);
    const c = data.campaign;
    if (!isObject(c) || typeof c.id !== 'string' || typeof c.name !== 'string') {
      throw new ImportError('El respaldo no contiene una campaña válida.');
    }
    for (const key of ['characters', 'notes', 'encounters', 'customEntries'] as const) checkEntities(data[key], key);
    return {
      ...(data as unknown as CampaignBundle),
      characters: (data.characters as Character[]) ?? [],
      notes: (data.notes as Note[]) ?? [],
      encounters: (data.encounters as Encounter[]) ?? [],
      customEntries: (data.customEntries as CustomEntry[]) ?? [],
    };
  }

  if (data.format === 'taking-dnd-notes-character') {
    checkVersion(data);
    const ch = data.character;
    if (!isObject(ch) || typeof ch.id !== 'string' || typeof ch.name !== 'string') {
      throw new ImportError('El respaldo no contiene un personaje válido.');
    }
    return data as unknown as CharacterBundle;
  }

  throw new ImportError('El archivo no es un respaldo de Taking D&D Notes.');
}

/** Importa siempre como campaña nueva (ids regenerados), así nunca pisa datos existentes. */
export async function importCampaign(bundle: CampaignBundle, database: AppDB = defaultDb): Promise<Campaign> {
  const b = remapIds(bundle);
  const now = Date.now();
  const nameTaken = (await database.campaigns.where('name').equals(b.campaign.name).count()) > 0;
  const campaign: Campaign = {
    ...b.campaign,
    name: nameTaken ? `${b.campaign.name} (importada)` : b.campaign.name,
    // Respaldos antiguos o editados a mano pueden traer ajustes incompletos.
    settings: { variantEncumbrance: false, ...(b.campaign.settings as Partial<CampaignSettings> | undefined) },
    updatedAt: now,
  };
  await database.transaction(
    'rw',
    [database.campaigns, database.characters, database.notes, database.encounters, database.customEntries],
    async () => {
      await database.campaigns.add(campaign);
      await database.characters.bulkAdd(b.characters);
      await database.notes.bulkAdd(b.notes);
      await database.encounters.bulkAdd(b.encounters);
      await database.customEntries.bulkAdd(b.customEntries);
    },
  );
  return campaign;
}

/** Agrega el personaje a la campaña indicada, como copia nueva. */
export async function importCharacter(
  bundle: CharacterBundle,
  campaignId: Id,
  database: AppDB = defaultDb,
): Promise<Character> {
  // La ficha wiki asociada no viaja con el personaje.
  const { noteId: _noteId, ...rest } = remapIds(bundle.character);
  const character: Character = { ...rest, campaignId, updatedAt: Date.now() };
  await database.characters.add(character);
  return character;
}
