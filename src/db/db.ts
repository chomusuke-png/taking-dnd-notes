import Dexie, { type EntityTable } from 'dexie';
import type { Campaign, Character, CustomEntry, Encounter, Note } from './types';

export class AppDB extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>;
  characters!: EntityTable<Character, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  encounters!: EntityTable<Encounter, 'id'>;
  customEntries!: EntityTable<CustomEntry, 'id'>;

  constructor(name = 'taking-dnd-notes') {
    super(name);
    // Al cambiar el esquema: agregar this.version(n + 1) con .upgrade(), nunca editar versiones existentes.
    this.version(1).stores({
      campaigns: 'id, name, updatedAt',
      characters: 'id, campaignId, kind, name',
      notes: 'id, campaignId, type, title, *tags, *links',
      encounters: 'id, campaignId',
      customEntries: 'id, campaignId, kind',
    });
  }
}

export const db = new AppDB();

/** Tablas que pertenecen a una campaña (todas salvo campaigns). */
export const CAMPAIGN_TABLES = ['characters', 'notes', 'encounters', 'customEntries'] as const;
