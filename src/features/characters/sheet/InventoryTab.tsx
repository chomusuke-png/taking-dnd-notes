import { Fragment, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { NumberField, TextField } from '../../../components/fields';
import type { InventoryItem } from '../../../db/types';
import { newId } from '../../../lib/id';
import { fold } from '../../../lib/text';
import { carryingCapacity, encumbrance, inventoryWeight } from '../../../rules/derive';
import { armorFromItem, attackFromWeapon, inventoryFromSrd } from '../../../rules/items';
import { useSrd, useSrdIndex, type SrdItem } from '../../../srd';
import { ITEM_CATEGORY_LABEL } from '../../../srd/labels';
import { ItemDetail } from '../../compendium/details';
import { useSheet } from './SheetContext';

const ENCUMBRANCE_LABEL = {
  normal: '',
  encumbered: 'Cargado: −10 pies de velocidad',
  heavily: 'Muy cargado: −20 pies y desventaja en pruebas, ataques y salvaciones de FUE, DES y CON',
  over: 'Por encima de la capacidad de carga',
} as const;

const MAX_ATTUNED = 3;

export function InventoryTab() {
  const { c, campaign, edit, update } = useSheet();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [weight, setWeight] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const srdIndex = useSrdIndex('items');
  // El catálogo completo solo se carga cuando se empieza a escribir un objeto nuevo.
  const catalog = useSrd('items', name.trim().length >= 2);
  const suggestions = useMemo(() => {
    const q = fold(name.trim());
    if (!catalog || q.length < 2) return [];
    return catalog.filter((i) => fold(i.name).includes(q)).slice(0, 8);
  }, [catalog, name]);

  const patch = (id: string, p: Partial<InventoryItem>) =>
    update((x) => ({ ...x, inventory: x.inventory.map((it) => (it.id === id ? { ...it, ...p } : it)) }));

  function addSrd(item: SrdItem) {
    const qtyN = Math.max(1, parseInt(qty, 10) || 1);
    update((x) => ({ ...x, inventory: [...x.inventory, inventoryFromSrd(item, qtyN)] }));
    setName('');
    setQty('1');
    setWeight('');
  }

  const srdOf = (it: InventoryItem) => ('source' in it.item && it.item.source === 'srd' ? srdIndex?.get(it.item.id) : undefined);

  function add() {
    if (!name.trim()) return;
    const item: InventoryItem = {
      id: newId(),
      item: { custom: name.trim() },
      name: name.trim(),
      qty: Math.max(1, parseInt(qty, 10) || 1),
      weight: Math.max(0, parseFloat(weight.replace(',', '.')) || 0),
      equipped: false,
      attuned: false,
      notes: '',
    };
    update((x) => ({ ...x, inventory: [...x.inventory, item] }));
    setName('');
    setQty('1');
    setWeight('');
  }

  const total = inventoryWeight(c);
  const capacity = carryingCapacity(c);
  const load = encumbrance(c);
  const attuned = c.inventory.filter((it) => it.attuned).length;

  return (
    <div>
      <table className="sheet-table inventory-table">
        <thead>
          <tr>
            <th title="Equipado" aria-label="Equipado">
              <Icon name="encounters" />
            </th>
            <th>Objeto</th>
            <th className="num">Cant.</th>
            <th className="num">Peso</th>
            <th title="Sintonizado" aria-label="Sintonizado">
              <Icon name="attuned" />
            </th>
            {edit && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {c.inventory.map((it) => {
            const srd = srdOf(it);
            const canAttack = srd?.weapon && !c.attacks.some((a) => a.name === it.name);
            const armor = srd ? armorFromItem(c.armor, srd) : undefined;
            const canEquipArmor = armor && JSON.stringify(armor) !== JSON.stringify(c.armor);
            return (
            <Fragment key={it.id}>
            <tr className={it.equipped ? 'is-equipped' : undefined}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Equipar ${it.name}`}
                  checked={it.equipped}
                  onChange={(e) => patch(it.id, { equipped: e.target.checked })}
                />
              </td>
              <td>
                {edit ? (
                  <TextField
                    className="input input-sm"
                    aria-label="Nombre"
                    value={it.name}
                    onCommit={(v) => v && patch(it.id, 'custom' in it.item ? { name: v, item: { custom: v } } : { name: v })}
                  />
                ) : srd ? (
                  <button type="button" className="item-name-btn" aria-expanded={expanded === it.id} onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
                    {it.name}
                  </button>
                ) : (
                  it.name
                )}
                {canAttack && (
                  <button
                    type="button"
                    className="chip item-action"
                    title="Agregar este arma a la pestaña Acciones"
                    onClick={() => update((x) => ({ ...x, attacks: [...x.attacks, attackFromWeapon(x, srd!)!] }))}
                  >
                    ＋ ataque
                  </button>
                )}
                {canEquipArmor && (
                  <button
                    type="button"
                    className="chip item-action"
                    title="Usar para calcular la CA"
                    onClick={() => update((x) => ({ ...x, armor: armorFromItem(x.armor, srd!)!, inventory: x.inventory.map((y) => (y.id === it.id ? { ...y, equipped: true } : y)) }))}
                  >
                    <Icon name="armorClass" /> usar para CA
                  </button>
                )}
              </td>
              <td className="num">
                <span className="stepper">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label="Quitar uno"
                    onClick={() =>
                      it.qty <= 1
                        ? update((x) => ({ ...x, inventory: x.inventory.filter((y) => y.id !== it.id) }))
                        : patch(it.id, { qty: it.qty - 1 })
                    }
                  >
                    −
                  </button>
                  <span className="qty">{it.qty}</span>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label="Agregar uno" onClick={() => patch(it.id, { qty: it.qty + 1 })}>
                    +
                  </button>
                </span>
              </td>
              <td className="num">
                {edit ? (
                  <NumberField className="input input-xs" aria-label="Peso unitario" value={it.weight} min={0} max={9999} onCommit={(w) => patch(it.id, { weight: w })} />
                ) : (
                  <span className="muted">{it.weight ? `${+(it.weight * it.qty).toFixed(2)} lb` : '—'}</span>
                )}
              </td>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Sintonizar ${it.name}`}
                  checked={it.attuned}
                  disabled={!it.attuned && attuned >= MAX_ATTUNED}
                  title={!it.attuned && attuned >= MAX_ATTUNED ? 'Máximo 3 objetos sintonizados' : 'Sintonizado'}
                  onChange={(e) => patch(it.id, { attuned: e.target.checked })}
                />
              </td>
              {edit && (
                <td className="row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger"
                    aria-label={`Eliminar ${it.name}`}
                    onClick={() => update((x) => ({ ...x, inventory: x.inventory.filter((y) => y.id !== it.id) }))}
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
            {expanded === it.id && srd && (
              <tr className="item-detail-row">
                <td colSpan={edit ? 6 : 5}>
                  <ItemDetail item={srd} />
                </td>
              </tr>
            )}
            </Fragment>
            );
          })}
        </tbody>
      </table>
      {c.inventory.length === 0 && <p className="muted empty-inline">Inventario vacío.</p>}

      <form
        className="add-item"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input" placeholder="Agregar objeto…" aria-label="Nombre del objeto" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input input-xs" inputMode="numeric" aria-label="Cantidad" title="Cantidad" value={qty} onChange={(e) => setQty(e.target.value)} />
        <input className="input input-xs" inputMode="decimal" aria-label="Peso unitario (lb)" placeholder="lb" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <button type="submit" className="btn" disabled={!name.trim()} title="Agregar como objeto libre">
          ＋
        </button>
        {suggestions.length > 0 && (
          <ul className="item-suggestions" role="listbox" aria-label="Objetos del SRD">
            {suggestions.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => addSrd(i)}>
                  <span>{i.name}</span>
                  <span className="muted small">
                    {ITEM_CATEGORY_LABEL[i.category]}
                    {i.weight ? ` · ${i.weight} lb` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <p className="muted small hint">Escribe para buscar en el SRD (en inglés: Rope, Longsword…) o agrega cualquier objeto libre con ＋.</p>

      <div className="carry">
        <span>
          Peso: <strong>{total}</strong> / {capacity} lb
        </span>
        <span className="muted small">Sintonizados {attuned}/{MAX_ATTUNED}</span>
      </div>
      {campaign.settings.variantEncumbrance && load !== 'normal' && <p className="warning small">{ENCUMBRANCE_LABEL[load]}</p>}
      {!campaign.settings.variantEncumbrance && load === 'over' && <p className="warning small">{ENCUMBRANCE_LABEL.over}</p>}
    </div>
  );
}
