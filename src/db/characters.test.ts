import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test/testDb';
import { createCampaign } from './campaigns';
import { createCharacter, deleteCharacter, updateCharacter } from './characters';

describe('characters', () => {
  it('al crear con clase aplica salvaciones, dado de golpe y PG promedio', async () => {
    const db = makeTestDb();
    const camp = await createCampaign({ name: 'C' }, db);
    const c = await createCharacter(camp.id, { name: 'Bruenor', kind: 'pc', classId: 'fighter', level: 3 }, db);
    expect(c.proficiencies.saves).toEqual(['str', 'con']);
    expect(c.classes).toEqual([{ classId: 'fighter', level: 3, hitDie: 10 }]);
    expect(c.hp).toEqual({ max: 10 + 6 + 6, current: 22, temp: 0 });
  });

  it('las actualizaciones encadenadas no se pisan', async () => {
    const db = makeTestDb();
    const camp = await createCampaign({ name: 'C' }, db);
    const c = await createCharacter(camp.id, { name: 'X', kind: 'pc' }, db);
    await Promise.all([
      updateCharacter(c.id, (x) => ({ ...x, currency: { ...x.currency, gp: x.currency.gp + 5 } }), db),
      updateCharacter(c.id, (x) => ({ ...x, currency: { ...x.currency, gp: x.currency.gp + 5 } }), db),
    ]);
    expect((await db.characters.get(c.id))?.currency.gp).toBe(10);
  });

  it('al eliminar suelta la referencia de la ficha wiki', async () => {
    const db = makeTestDb();
    const camp = await createCampaign({ name: 'C' }, db);
    const c = await createCharacter(camp.id, { name: 'X', kind: 'npc' }, db);
    await db.notes.add({
      id: 'n1', campaignId: camp.id, type: 'npc', title: 'X', aliases: [], content: null, tags: [], links: [],
      characterId: c.id, createdAt: 0, updatedAt: 0,
    });
    await deleteCharacter(c.id, db);
    expect(await db.characters.get(c.id)).toBeUndefined();
    expect((await db.notes.get('n1'))?.characterId).toBeUndefined();
  });
});
