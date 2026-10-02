import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test/testDb';
import {
  BACKUP_VERSION, ImportError, exportCampaign, exportCharacter, importCampaign, importCharacter, parseBackup, remapIds,
  type CampaignBundle,
} from './backup';
import { createCampaign } from './campaigns';
import { newCharacter } from './factories';
import type { Note } from './types';

async function seed() {
  const db = makeTestDb();
  const campaign = await createCampaign({ name: 'Strahd' }, db);
  const pc = newCharacter(campaign.id, { name: 'Ireena' });
  pc.inventory.push({
    id: crypto.randomUUID(), item: { source: 'srd', id: 'longsword' }, qty: 1, equipped: true, attuned: false, weight: 3, notes: '',
  });
  const note: Note = {
    id: crypto.randomUUID(), campaignId: campaign.id, type: 'npc', title: 'Ireena', aliases: [], tags: ['barovia'],
    content: { type: 'doc', content: [{ type: 'mention', attrs: { id: pc.id } }] },
    links: [pc.id], characterId: pc.id, createdAt: 0, updatedAt: 0,
  };
  pc.noteId = note.id;
  await db.characters.add(pc);
  await db.notes.add(note);
  return { db, campaign, pc, note };
}

describe('remapIds', () => {
  it('cambia los UUID de forma consistente y deja los slugs del SRD', () => {
    const a = crypto.randomUUID();
    const out = remapIds({ id: a, ref: a, srd: { source: 'srd', id: 'fireball' } });
    expect(out.id).not.toBe(a);
    expect(out.ref).toBe(out.id);
    expect(out.srd.id).toBe('fireball');
  });
});

describe('export/import de campaña', () => {
  it('ida y vuelta conserva el contenido y las referencias', async () => {
    const { db, campaign } = await seed();
    const bundle = await exportCampaign(campaign.id, db);
    const parsed = parseBackup(JSON.stringify(bundle)) as CampaignBundle;

    const imported = await importCampaign(parsed, db);
    expect(imported.id).not.toBe(campaign.id);
    expect(imported.name).toBe('Strahd (importada)');

    const [pc] = await db.characters.where('campaignId').equals(imported.id).toArray();
    const [note] = await db.notes.where('campaignId').equals(imported.id).toArray();
    expect(pc.name).toBe('Ireena');
    expect(pc.inventory[0].item).toEqual({ source: 'srd', id: 'longsword' });
    expect(pc.noteId).toBe(note.id);
    expect(note.characterId).toBe(pc.id);
    expect(note.links).toEqual([pc.id]);
    expect(JSON.stringify(note.content)).toContain(pc.id);

    // El original sigue intacto.
    expect(await db.characters.count()).toBe(2);
    expect(await db.notes.count()).toBe(2);
  });

  it('acepta respaldos sin colecciones opcionales', () => {
    const minimal = { format: 'grimorio-campaign', version: 1, campaign: { id: crypto.randomUUID(), name: 'X' } };
    const parsed = parseBackup(JSON.stringify(minimal)) as CampaignBundle;
    expect(parsed.characters).toEqual([]);
    expect(parsed.notes).toEqual([]);
  });

  it.each([
    ['no es JSON', '{nope'],
    ['formato desconocido', JSON.stringify({ format: 'otro' })],
    ['versión futura', JSON.stringify({ format: 'grimorio-campaign', version: BACKUP_VERSION + 1, campaign: { id: 'a', name: 'b' } })],
    ['sin campaña', JSON.stringify({ format: 'grimorio-campaign', version: 1 })],
    ['colección inválida', JSON.stringify({ format: 'grimorio-campaign', version: 1, campaign: { id: 'a', name: 'b' }, notes: [1] })],
  ])('rechaza: %s', (_label, text) => {
    expect(() => parseBackup(text)).toThrow(ImportError);
  });
});

describe('export/import de personaje', () => {
  it('copia el personaje a otra campaña sin la ficha wiki', async () => {
    const { db, pc } = await seed();
    const other = await createCampaign({ name: 'Otra' }, db);
    const bundle = parseBackup(JSON.stringify(await exportCharacter(pc.id, db)));
    expect(bundle.format).toBe('grimorio-character');
    if (bundle.format !== 'grimorio-character') return;

    const copy = await importCharacter(bundle, other.id, db);
    expect(copy.id).not.toBe(pc.id);
    expect(copy.campaignId).toBe(other.id);
    expect(copy.noteId).toBeUndefined();
    expect(copy.name).toBe('Ireena');
  });
});
