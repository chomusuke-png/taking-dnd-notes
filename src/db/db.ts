import Dexie, { type EntityTable } from 'dexie';
import { normalizeCharacter } from './normalize';
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
    // v2 (F1): armadura, bonificadores, Jack of all trades y spellcasting obligatorio.
    this.version(2).upgrade((tx) =>
      tx.table<Character>('characters').toCollection().modify((c, ref) => {
        ref.value = normalizeCharacter(c);
      }),
    );
  }
}

export const db = new AppDB();

/** Tablas que pertenecen a una campaña (todas salvo campaigns). */
export const CAMPAIGN_TABLES = ['characters', 'notes', 'encounters', 'customEntries'] as const;
