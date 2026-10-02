import { useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import { ABILITIES, type Attack } from '../../../db/types';
import { newId } from '../../../lib/id';
import { attackBonus, damageExpression, formatMod, spellcastingStats } from '../../../rules/derive';
import { getClass } from '../../../rules/classes';
import { ABILITY_LABEL } from '../../../rules/labels';
import { useSheet } from './SheetContext';

const blankAttack = (): Attack => ({
  id: newId(), name: '', ability: 'str', proficient: true, damage: '1d6', damageType: '', bonus: 0,
});

export function ActionsTab() {
  const { c, edit, update, check, rollExpr } = useSheet();
  const [editing, setEditing] = useState<Attack | null>(null);
  const spells = spellcastingStats(c);

  const save = (a: Attack) =>
    update((x) => ({
      ...x,
      attacks: x.attacks.some((y) => y.id === a.id) ? x.attacks.map((y) => (y.id === a.id ? a : y)) : [...x.attacks, a],
    }));

  return (
    <div>
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Ataque</th>
            <th className="num">Bono</th>
            <th>Daño</th>
            {edit && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {c.attacks.map((a) => {
            const bonus = attackBonus(c, a);
            const dmg = damageExpression(c, a);
            return (
              <tr key={a.id}>
                <td>
                  <strong>{a.name}</strong>
                  <span className="muted small"> {ABILITY_LABEL[a.ability].short}</span>
                </td>
                <td className="num">
                  <button type="button" className="roll-btn" onClick={() => check(`Ataque: ${a.name}`, bonus)}>
                    {formatMod(bonus)}
                  </button>
                </td>
                <td>
                  {dmg ? (
                    <button type="button" className="roll-btn" onClick={() => rollExpr(`Daño: ${a.name}`, dmg)}>
                      {dmg}
                    </button>
                  ) : (
                    <span className="muted">—</span>
                  )}
                  {a.damageType && <span className="muted small"> {a.damageType}</span>}
                </td>
                {edit && (
                  <td className="row-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(a)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-danger"
                      aria-label={`Eliminar ${a.name}`}
                      onClick={() => update((x) => ({ ...x, attacks: x.attacks.filter((y) => y.id !== a.id) }))}
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {spells.map((s) => (
            <tr key={s.ability} className="spell-attack-row">
              <td>
                <strong>Ataque de conjuro</strong>
                <span className="muted small"> {getClass(s.classId)?.name}</span>
              </td>
              <td className="num">
                <button type="button" className="roll-btn" onClick={() => check('Ataque de conjuro', s.attack)}>
                  {formatMod(s.attack)}
                </button>
              </td>
              <td className="muted small">CD de salvación {s.saveDc}</td>
              {edit && <td />}
            </tr>
          ))}
        </tbody>
      </table>

      {c.attacks.length === 0 && spells.length === 0 && (
        <p className="muted empty-inline">Sin ataques. {edit ? 'Agrega uno abajo.' : 'Activa el modo edición para agregarlos.'}</p>
      )}
      {edit && (
        <button type="button" className="btn btn-sm" onClick={() => setEditing(blankAttack())}>
          ＋ Agregar ataque
        </button>
      )}
      <p className="muted small hint">Clic en el bono para tirar el ataque y en el daño para tirar el daño. Usa 🎲 para ventaja o desventaja.</p>

      <AttackDialog key={editing?.id ?? 'closed'} attack={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

function AttackDialog({ attack, onClose, onSave }: { attack: Attack | null; onClose: () => void; onSave: (a: Attack) => void }) {
  // El padre monta el diálogo con key = id del ataque, así el borrador se reinicia solo.
  const [d, setDraft] = useState<Attack | null>(attack);
  const set = (patch: Partial<Attack>) => setDraft((x) => (x ? { ...x, ...patch } : x));

  return (
    <Dialog
      open={attack !== null}
      onClose={onClose}
      title={attack?.name ? `Editar ${attack.name}` : 'Nuevo ataque'}
      onSubmit={() => {
        if (!d?.name.trim()) return;
        onSave({ ...d, name: d.name.trim() });
        onClose();
      }}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!d?.name.trim()}>
            Guardar
          </button>
        </>
      }
    >
      {d && (
        <>
          <div className="field">
            <label htmlFor="atk-name">Nombre</label>
            <input id="atk-name" className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Espada larga" autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="atk-ability">Característica</label>
              <select id="atk-ability" className="input" value={d.ability} onChange={(e) => set({ ability: e.target.value as Attack['ability'] })}>
                {ABILITIES.map((a) => (
                  <option key={a} value={a}>
                    {ABILITY_LABEL[a].long}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="atk-bonus">Bono mágico</label>
              <input
                id="atk-bonus"
                className="input"
                type="number"
                value={d.bonus}
                onChange={(e) => set({ bonus: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="atk-dmg">Dados de daño</label>
              <input id="atk-dmg" className="input" value={d.damage} onChange={(e) => set({ damage: e.target.value })} placeholder="1d8" />
            </div>
            <div className="field">
              <label htmlFor="atk-type">Tipo de daño</label>
              <input id="atk-type" className="input" value={d.damageType} onChange={(e) => set({ damageType: e.target.value })} placeholder="cortante" />
            </div>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={d.proficient} onChange={(e) => set({ proficient: e.target.checked })} />
            Competente con esta arma
          </label>
          <p className="muted small">El modificador de característica y el bono mágico se suman al ataque y al daño.</p>
        </>
      )}
    </Dialog>
  );
}
