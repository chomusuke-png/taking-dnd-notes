import { updateCharacter } from '../../db/characters';
import type { Condition, Id } from '../../db/types';
import { applyDamage, heal } from '../../rules/hp';
import { useUi } from '../../store/ui';

// Acciones sobre la hoja de un personaje usadas fuera de ella (encuentros, vista de grupo).

export function damageCharacter(id: Id, amount: number): Promise<void> {
  const toast = useUi.getState().toast;
  return updateCharacter(id, (c) => {
    const { character, outcome } = applyDamage(c, amount);
    if (outcome === 'dead') toast(`💀 ${c.name} ha muerto.`, 'error');
    else if (outcome === 'down' && c.hp.current > 0) toast(`${c.name} cae inconsciente.`, 'error');
    return character;
  });
}

export const healCharacter = (id: Id, amount: number) => updateCharacter(id, (c) => heal(c, amount));

export const toggleCharacterCondition = (id: Id, cond: Condition) =>
  updateCharacter(id, (c) => ({
    ...c,
    conditions: c.conditions.includes(cond) ? c.conditions.filter((x) => x !== cond) : [...c.conditions, cond],
  }));
