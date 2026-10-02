import { describe, expect, it } from 'vitest';
import { plainText } from '../lib/richText';
import { makeTestDb } from '../test/testDb';
import { createCampaign } from './campaigns';
import { createCharacter, updateCharacter } from './characters';
import { backlinks, createNote, deleteNote, updateNote } from './notes';

const mentionDoc = (id: string, label: string, kind = 'note') => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ver ' }, { type: 'mention', attrs: { id, label, kind } }] }],
});

async function setup() {
  const db = makeTestDb();
  const camp = await createCampaign({ name: 'C' }, db);
  return { db, camp };
}

describe('notes', () => {
  it('las sesiones se numeran solas', async () => {
    const { db, camp } = await setup();
    const s1 = await createNote(camp.id, { type: 'session' }, db);
    const s2 = await createNote(camp.id, { type: 'session' }, db);
    expect([s1.title, s2.title]).toEqual(['Sesión 1', 'Sesión 2']);
    expect(s2.session?.number).toBe(2);
  });

  it('las misiones empiezan activas y los títulos vacíos tienen uno por defecto', async () => {
    const { db, camp } = await setup();
    const q = await createNote(camp.id, { type: 'quest' }, db);
    expect(q.quest).toEqual({ status: 'active' });
    expect(q.title).toBe('Misión sin título');
  });

  it('al guardar el contenido se recalculan los enlaces y los backlinks', async () => {
    const { db, camp } = await setup();
    const npc = await createNote(camp.id, { type: 'npc', title: 'Sildar' }, db);
    const s = await createNote(camp.id, { type: 'session' }, db);
    await updateNote(s.id, { content: mentionDoc(npc.id, 'Sildar') }, db);
    expect((await db.notes.get(s.id))?.links).toEqual([npc.id]);
    expect((await backlinks(npc.id, db)).map((n) => n.id)).toEqual([s.id]);

    await updateNote(s.id, { content: { type: 'doc', content: [] } }, db);
    expect(await backlinks(npc.id, db)).toEqual([]);
  });

  it('renombrar una nota actualiza las menciones en otras notas', async () => {
    const { db, camp } = await setup();
    const npc = await createNote(camp.id, { type: 'npc', title: 'Sildar' }, db);
    const s = await createNote(camp.id, { type: 'session' }, db);
    await updateNote(s.id, { content: mentionDoc(npc.id, 'Sildar') }, db);
    await updateNote(npc.id, { title: 'Sildar Hallwinter' }, db);
    expect(plainText((await db.notes.get(s.id))?.content)).toBe('Ver Sildar Hallwinter');
  });

  it('renombrar un personaje actualiza sus menciones', async () => {
    const { db, camp } = await setup();
    const pc = await createCharacter(camp.id, { name: 'Thorin', kind: 'pc' }, db);
    const s = await createNote(camp.id, { type: 'session' }, db);
    await updateNote(s.id, { content: mentionDoc(pc.id, 'Thorin', 'character') }, db);
    await updateCharacter(pc.id, (c) => ({ ...c, name: 'Thorin II' }), db);
    expect(plainText((await db.notes.get(s.id))?.content)).toBe('Ver Thorin II');
  });

  it('cambiar el tipo de sesión a wiki quita los datos de sesión; un título vacío no se guarda', async () => {
    const { db, camp } = await setup();
    const s = await createNote(camp.id, { type: 'session' }, db);
    await updateNote(s.id, { type: 'location', title: '   ' }, db);
    const n = await db.notes.get(s.id);
    expect(n?.session).toBeUndefined();
    expect(n?.title).toBe('Sesión 1');
    await deleteNote(s.id, db);
    expect(await db.notes.get(s.id)).toBeUndefined();
  });
});
