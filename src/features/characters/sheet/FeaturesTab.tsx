import { useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import { Pips } from '../../../components/fields';
import type { Feature, Recharge } from '../../../db/types';
import { newId } from '../../../lib/id';
import { RECHARGE_LABEL } from '../../../rules/labels';
import { useSheet } from './SheetContext';

const blankFeature = (): Feature => ({ id: newId(), name: '', source: '', description: '' });

export function FeaturesTab() {
  const { c, edit, update } = useSheet();
  const [editing, setEditing] = useState<Feature | null>(null);

  const save = (f: Feature) =>
    update((x) => ({
      ...x,
      features: x.features.some((y) => y.id === f.id) ? x.features.map((y) => (y.id === f.id ? f : y)) : [...x.features, f],
    }));

  const setUsed = (id: string, used: number) =>
    update((x) => ({
      ...x,
      features: x.features.map((f) => (f.id === id && f.uses ? { ...f, uses: { ...f.uses, used } } : f)),
    }));

  return (
    <div>
      {c.features.length === 0 && (
        <p className="muted empty-inline">
          Sin rasgos. Agrega rasgos de raza, clase y dotes; los que tienen usos se recargan solos al descansar.
        </p>
      )}
      <ul className="feature-list">
        {c.features.map((f) => (
          <li key={f.id} className="feature">
            <div className="feature-head">
              <div>
                <strong>{f.name}</strong>
                {f.source && <span className="muted small"> · {f.source}</span>}
              </div>
              {edit && (
                <span className="row-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(f)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger"
                    aria-label={`Eliminar ${f.name}`}
                    onClick={() => update((x) => ({ ...x, features: x.features.filter((y) => y.id !== f.id) }))}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            {f.uses && (
              <div className="feature-uses">
                <Pips total={f.uses.max} used={Math.min(f.uses.max, f.uses.used)} label={`Uso de ${f.name}`} onChange={(u) => setUsed(f.id, u)} />
                <span className="muted small">
                  {f.uses.max - Math.min(f.uses.max, f.uses.used)}/{f.uses.max} · {RECHARGE_LABEL[f.uses.recharge]}
                </span>
              </div>
            )}
            {f.description && <p className="feature-desc">{f.description}</p>}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-sm" onClick={() => setEditing(blankFeature())}>
        ＋ Agregar rasgo
      </button>

      <FeatureDialog key={editing?.id ?? 'closed'} feature={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

function FeatureDialog({ feature, onClose, onSave }: { feature: Feature | null; onClose: () => void; onSave: (f: Feature) => void }) {
  const [d, setD] = useState<Feature | null>(feature);
  const set = (patch: Partial<Feature>) => setD((x) => (x ? { ...x, ...patch } : x));
  const hasUses = d?.uses !== undefined;

  return (
    <Dialog
      open={feature !== null}
      onClose={onClose}
      title={feature?.name ? `Editar ${feature.name}` : 'Nuevo rasgo'}
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
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="ft-name">Nombre</label>
              <input id="ft-name" className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Furia" autoFocus />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="ft-source">Origen</label>
              <input id="ft-source" className="input" value={d.source} onChange={(e) => set({ source: e.target.value })} placeholder="Bárbaro 1" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ft-desc">Descripción</label>
            <textarea id="ft-desc" className="textarea" rows={4} value={d.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={hasUses}
              onChange={(e) => set({ uses: e.target.checked ? { max: 1, used: 0, recharge: 'long' } : undefined })}
            />
            Tiene usos limitados
          </label>
          {d.uses && (
            <div className="field-row" style={{ marginTop: 10 }}>
              <div className="field">
                <label htmlFor="ft-max">Usos máximos</label>
                <input
                  id="ft-max"
                  className="input"
                  type="number"
                  min={1}
                  max={20}
                  value={d.uses.max}
                  onChange={(e) => set({ uses: { ...d.uses!, max: Math.min(20, Math.max(1, Number(e.target.value) || 1)) } })}
                />
              </div>
              <div className="field">
                <label htmlFor="ft-recharge">Se recarga</label>
                <select
                  id="ft-recharge"
                  className="input"
                  value={d.uses.recharge}
                  onChange={(e) => set({ uses: { ...d.uses!, recharge: e.target.value as Recharge } })}
                >
                  {Object.entries(RECHARGE_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
