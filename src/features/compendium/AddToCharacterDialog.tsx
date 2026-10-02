import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import { updateCharacter } from '../../db/characters';
import { db } from '../../db/db';
import type { Character, Id } from '../../db/types';
import { getClass } from '../../rules/classes';
import { armorFromItem, attackFromWeapon, inventoryFromSrd } from '../../rules/items';
import { addSpell, casterClasses, spellListClass } from '../../rules/spells';
import type { SrdItem, SrdSpell } from '../../srd/types';
import { useUi } from '../../store/ui';

type Target = { kind: 'spell'; spell: SrdSpell } | { kind: 'item'; item: SrdItem };

interface Props {
  campaignId: Id;
  target: Target | null;
  onClose: () => void;
}

/** Agrega un conjuro (a la lista de una clase) o un objeto (al inventario) a un personaje de la campaña. */
export function AddToCharacterDialog({ campaignId, target, onClose }: Props) {
  const characters = useLiveQuery(() => db.characters.where('campaignId').equals(campaignId).sortBy('name'), [campaignId]);
  const [charId, setCharId] = useState('');
  const [classId, setClassId] = useState('');
  const [qty, setQty] = useState(1);
  const [makeAttack, setMakeAttack] = useState(true);
  const [equipArmor, setEquipArmor] = useState(true);
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();

  // Para conjuros solo se ofrecen personajes con una clase cuya lista incluya el conjuro.
  const eligible = useMemo(() => {
    if (!characters || !target) return [];
    if (target.kind === 'item') return characters;
    return characters.filter((c) => casterClasses(c).some((cls) => target.spell.classes.includes(spellListClass(cls))));
  }, [characters, target]);

  const chosen = eligible.find((c) => c.id === charId);
  const classOptions = useMemo(
    () =>
      chosen && target?.kind === 'spell'
        ? casterClasses(chosen).filter((cls) => target.spell.classes.includes(spellListClass(cls)))
        : [],
    [chosen, target],
  );

  useEffect(() => {
    if (!target) return;
    setQty(1);
    setMakeAttack(true);
    setEquipArmor(true);
  }, [target]);
  useEffect(() => {
    if (eligible.length && !eligible.some((c) => c.id === charId)) setCharId(eligible[0].id);
  }, [eligible, charId]);
  useEffect(() => {
    if (classOptions.length && !classOptions.some((c) => c.classId === classId)) setClassId(classOptions[0].classId);
  }, [classOptions, classId]);

  async function submit() {
    if (!chosen || !target) return;
    const change = (c: Character): Character => {
      if (target.kind === 'spell') return addSpell(c, classId, target.spell.id);
      let next: Character = { ...c, inventory: [...c.inventory, { ...inventoryFromSrd(target.item, qty), equipped: !!target.item.armor && equipArmor }] };
      const attack = target.item.weapon && makeAttack ? attackFromWeapon(c, target.item) : undefined;
      if (attack) next = { ...next, attacks: [...next.attacks, attack] };
      const armor = target.item.armor && equipArmor ? armorFromItem(c.armor, target.item) : undefined;
      if (armor) next = { ...next, armor };
      return next;
    };
    await updateCharacter(chosen.id, change);
    const what = target.kind === 'spell' ? target.spell.name : target.item.name;
    toast(`${what} agregado a ${chosen.name}.`);
    onClose();
  }

  const name = target?.kind === 'spell' ? target.spell.name : target?.item.name;

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={`Agregar ${name ?? ''}`}
      onSubmit={() => void submit()}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!chosen || (target?.kind === 'spell' && !classId)}>
            Agregar
          </button>
        </>
      }
    >
      {characters !== undefined && eligible.length === 0 ? (
        <div>
          <p className="muted">
            {target?.kind === 'spell'
              ? 'Ningún personaje de la campaña tiene una clase con este conjuro en su lista.'
              : 'La campaña aún no tiene personajes.'}
          </p>
          <button type="button" className="btn btn-sm" onClick={() => { onClose(); navigate(`/c/${campaignId}/personajes`); }}>
            Ir a personajes
          </button>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="atc-char">Personaje</label>
            <select id="atc-char" className="input" value={charId} onChange={(e) => setCharId(e.target.value)}>
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.kind === 'npc' ? '(PNJ)' : ''}
                </option>
              ))}
            </select>
          </div>
          {target?.kind === 'spell' && classOptions.length > 1 && (
            <div className="field">
              <label htmlFor="atc-class">Lista de conjuros de</label>
              <select id="atc-class" className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classOptions.map((cls) => (
                  <option key={cls.classId} value={cls.classId}>
                    {getClass(cls.classId)?.name ?? cls.classId}
                  </option>
                ))}
              </select>
            </div>
          )}
          {target?.kind === 'item' && (
            <>
              <div className="field">
                <label htmlFor="atc-qty">Cantidad</label>
                <input id="atc-qty" className="input input-xs" type="number" min={1} max={999} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              {target.item.weapon && (
                <label className="checkbox">
                  <input type="checkbox" checked={makeAttack} onChange={(e) => setMakeAttack(e.target.checked)} />
                  Crear el ataque en la hoja
                </label>
              )}
              {target.item.armor && (
                <label className="checkbox">
                  <input type="checkbox" checked={equipArmor} onChange={(e) => setEquipArmor(e.target.checked)} />
                  {target.item.armor.kind === 'shield' ? 'Equipar el escudo (+2 CA)' : 'Equipar como armadura (actualiza la CA)'}
                </label>
              )}
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
