import { newId } from '../lib/id';
import { emptyDoc, extractLinks, relabelMentions } from '../lib/richText';
import { db as defaultDb, type AppDB } from './db';
import type { Id, Note, NoteType } from './types';

export const NOTE_TYPE_INFO: Record<NoteType, { label: string; plural: string; icon: string }> = {
  session: { label: 'Sesión', plural: 'Sesiones', icon: '📜' },
  npc: { label: 'PNJ', plural: 'PNJ', icon: '🎭' },
  location: { label: 'Lugar', plural: 'Lugares', icon: '🏰' },
  quest: { label: 'Misión', plural: 'Misiones', icon: '❗' },
  faction: { label: 'Facción', plural: 'Facciones', icon: '⚜️' },
  item: { label: 'Objeto', plural: 'Objetos', icon: '💎' },
  free: { label: 'General', plural: 'General', icon: '📝' },
};

export const WIKI_TYPES: NoteType[] = ['npc', 'location', 'quest', 'faction', 'item', 'free'];

export const QUEST_STATUS_LABEL = { active: 'Activa', done: 'Completada', failed: 'Fallida' } as const;

/** Ruta de una nota dentro de la campaña: las sesiones viven en el Diario, el resto en la Wiki. */
export const notePath = (n: Pick<Note, 'id' | 'type'>): string => `${n.type === 'session' ? 'diario' : 'wiki'}/${n.id}`;

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function nextSessionNumber(campaignId: Id, database: AppDB = defaultDb): Promise<number> {
  const sessions = await database.notes.where('campaignId').equals(campaignId).filter((n) => n.type === 'session').toArray();
  return sessions.reduce((max, n) => Math.max(max, n.session?.number ?? 0), 0) + 1;
}

export interface NewNoteInput {
  type: NoteType;
  title?: string;
  /** Permite fijar el id de antemano (al crear una nota desde un [[enlace]]). */
  id?: Id;
}

export async function createNote(campaignId: Id, input: NewNoteInput, database: AppDB = defaultDb): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: input.id ?? newId(),
    campaignId,
    type: input.type,
    title: input.title?.trim() ?? '',
    aliases: [],
    content: emptyDoc(),
    tags: [],
    links: [],
    createdAt: now,
    updatedAt: now,
  };
  if (input.type === 'session') {
    const number = await nextSessionNumber(campaignId, database);
    note.session = { number, date: todayIso() };
    if (!note.title) note.title = `Sesión ${number}`;
  }
  if (input.type === 'quest') note.quest = { status: 'active' };
  if (!note.title) note.title = `${NOTE_TYPE_INFO[input.type].label} sin título`;

  await database.transaction('rw', database.notes, database.campaigns, async () => {
    await database.notes.add(note);
    await database.campaigns.update(campaignId, { updatedAt: now });
  });
  return note;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'type' | 'content' | 'tags' | 'aliases' | 'session' | 'quest' | 'characterId'>>;

/**
 * Guarda cambios en una nota. Recalcula los enlaces si cambia el contenido y, si cambia
 * el título, actualiza la etiqueta de las menciones a esta nota en el resto de la campaña.
 */
export async function updateNote(id: Id, patch: NotePatch, database: AppDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.notes, database.campaigns, async () => {
    const current = await database.notes.get(id);
    if (!current) return;
    const now = Date.now();
    const next: Note = { ...current, ...patch, updatedAt: now };
    if (patch.title !== undefined) next.title = patch.title.trim() || current.title;
    if (patch.content !== undefined) next.links = extractLinks(patch.content);
    if (patch.type && patch.type !== 'session') delete next.session;
    if (patch.type === 'quest' && !next.quest) next.quest = { status: 'active' };
    await database.notes.put(next);
    if (next.title !== current.title) await relabelInCampaign(current.campaignId, id, next.title, database);
    await database.campaigns.update(current.campaignId, { updatedAt: now });
  });
}

export async function deleteNote(id: Id, database: AppDB = defaultDb): Promise<void> {
  await database.notes.delete(id);
}

/**
 * Actualiza la etiqueta visible de las menciones a `targetId` (nota o personaje).
 * Usa el índice multiEntry de `links`, así solo toca las notas que lo mencionan.
 * Debe llamarse dentro de una transacción que incluya `notes`.
 */
export async function relabelInCampaign(campaignId: Id, targetId: Id, label: string, database: AppDB): Promise<void> {
  const linking = await database.notes.where('links').equals(targetId).toArray();
  for (const n of linking) {
    if (n.campaignId !== campaignId) continue;
    const { doc, changed } = relabelMentions(n.content, targetId, label);
    if (changed) await database.notes.update(n.id, { content: doc });
  }
}

/** Notas que mencionan a `targetId`, más recientes primero. */
export async function backlinks(targetId: Id, database: AppDB = defaultDb): Promise<Note[]> {
  const notes = await database.notes.where('links').equals(targetId).toArray();
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}
