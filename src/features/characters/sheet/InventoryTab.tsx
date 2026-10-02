import { useState } from 'react';
import { NumberField, TextField } from '../../../components/fields';
import type { InventoryItem } from '../../../db/types';
import { newId } from '../../../lib/id';
import { carryingCapacity, encumbrance, inventoryWeight } from '../../../rules/derive';
import { useSheet } from './SheetContext';

const ENCUMBRANCE_LABEL = {
  normal: '',
  encumbered: 'Cargado: −10 pies de velocidad',
  heavily: 'Muy cargado: −20 pies y desventaja en pruebas, ataques y salvaciones de FUE, DES y CON',
  over: 'Por encima de la capacidad de carga',
} as const;

const MAX_ATTUNED = 3;

export const itemName = (it: InventoryItem): string => ('custom' in it.item ? it.item.custom : it.item.id);

export function InventoryTab() {
  const { c, campaign, edit, update } = useSheet();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [weight, setWeight] = useState('');

  const patch = (id: string, p: Partial<InventoryItem>) =>
    update((x) => ({ ...x, inventory: x.inventory.map((it) => (it.id === id ? { ...it, ...p } : it)) }));

  function add() {
    if (!name.trim()) return;
    const item: InventoryItem = {
      id: newId(),
      item: { custom: name.trim() },
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
            <th title="Equipado" aria-label="Equipado">⚔️</th>
            <th>Objeto</th>
            <th className="num">Cant.</th>
            <th className="num">Peso</th>
            <th title="Sintonizado" aria-label="Sintonizado">✦</th>
            {edit && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {c.inventory.map((it) => (
            <tr key={it.id} className={it.equipped ? 'is-equipped' : undefined}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Equipar ${itemName(it)}`}
                  checked={it.equipped}
                  onChange={(e) => patch(it.id, { equipped: e.target.checked })}
                />
              </td>
              <td>
                {edit ? (
                  <TextField
                    className="input input-sm"
                    aria-label="Nombre"
                    value={itemName(it)}
                    onCommit={(v) => v && patch(it.id, { item: { custom: v } })}
                  />
                ) : (
                  itemName(it)
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
                  aria-label={`Sintonizar ${itemName(it)}`}
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
                    aria-label={`Eliminar ${itemName(it)}`}
                    onClick={() => update((x) => ({ ...x, inventory: x.inventory.filter((y) => y.id !== it.id) }))}
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
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
        <button type="submit" className="btn" disabled={!name.trim()}>
          ＋
        </button>
      </form>

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
