import { describe, expect, it } from 'vitest';
import { addCombatants, customCombatant, startEncounter } from '../rules/encounter';
import { makeTestDb } from '../test/testDb';
import { createCampaign } from './campaigns';
import { createEncounter, duplicateEncounter, updateEncounter } from './encounters';

describe('encounters', () => {
  it('crea con nombre por defecto, actualiza y duplica limpio', async () => {
    const db = makeTestDb();
    const camp = await createCampaign({ name: 'C' }, db);
    const e = await createEncounter(camp.id, '  ', db);
    expect(e.name).toBe('Encuentro 1');

    const orc = { ...customCombatant({ name: 'Orco', hp: 15, ac: 13, initBonus: 1 }), initiative: 12 };
    await updateEncounter(e.id, (x) => startEncounter(addCombatants(x, [orc])), db);
    await updateEncounter(e.id, (x) => ({ ...x, combatants: x.combatants.map((c) => ({ ...c, hp: 3, conditions: ['prone'] })) }), db);
    const saved = await db.encounters.get(e.id);
    expect(saved?.round).toBe(1);
    expect(saved?.activeId).toBe(saved?.combatants[0].id);

    const copy = await duplicateEncounter(e.id, db);
    expect(copy).toMatchObject({ name: 'Encuentro 1 (copia)', round: 0, activeId: undefined });
    expect(copy?.combatants[0]).toMatchObject({ name: 'Orco', hp: 15, initiative: null, conditions: [] });
    expect(copy?.combatants[0].id).not.toBe(saved?.combatants[0].id);
  });
});
