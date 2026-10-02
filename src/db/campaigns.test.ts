import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test/testDb';
import { countCampaignContent, createCampaign, deleteCampaign, updateCampaign } from './campaigns';
import { newCharacter } from './factories';

describe('campaigns', () => {
  it('crea y actualiza una campaña', async () => {
    const db = makeTestDb();
    const c = await createCampaign({ name: '  La Mina Perdida ', description: 'Phandelver' }, db);
    expect(c.name).toBe('La Mina Perdida');
    await updateCampaign(c.id, { name: 'Phandelver' }, db);
    expect((await db.campaigns.get(c.id))?.name).toBe('Phandelver');
  });

  it('rechaza nombres vacíos', async () => {
    const db = makeTestDb();
    await expect(createCampaign({ name: '   ' }, db)).rejects.toThrow();
  });

  it('al eliminar borra en cascada solo el contenido de esa campaña', async () => {
    const db = makeTestDb();
    const a = await createCampaign({ name: 'A' }, db);
    const b = await createCampaign({ name: 'B' }, db);
    await db.characters.bulkAdd([newCharacter(a.id, { name: 'Tordek' }), newCharacter(b.id, { name: 'Lidda' })]);

    expect(await countCampaignContent(a.id, db)).toEqual({ characters: 1, notes: 0, encounters: 0 });
    await deleteCampaign(a.id, db);

    expect(await db.campaigns.get(a.id)).toBeUndefined();
    expect(await db.characters.count()).toBe(1);
    expect((await db.characters.toArray())[0].name).toBe('Lidda');
  });
});
