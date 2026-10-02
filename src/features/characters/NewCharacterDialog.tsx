import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import type { NewCharacterInput } from '../../db/characters';
import type { Character } from '../../db/types';
import { CLASSES } from '../../rules/classes';

interface Props {
  open: boolean;
  defaultKind: Character['kind'];
  onSubmit: (input: NewCharacterInput) => Promise<void>;
  onClose: () => void;
}

export function NewCharacterDialog({ open, defaultKind, onSubmit, onClose }: Props) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Character['kind']>(defaultKind);
  const [classId, setClassId] = useState('');
  const [level, setLevel] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setKind(defaultKind);
    setClassId('');
    setLevel(1);
    setError('');
  }, [open, defaultKind]);

  async function submit() {
    if (!name.trim()) return setError('Escribe un nombre.');
    try {
      await onSubmit({ name, kind, classId: classId || undefined, level });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo personaje"
      onSubmit={submit}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Crear
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="nc-name">Nombre</label>
        <input id="nc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Tipo</label>
        <div className="seg" role="radiogroup">
          {(['pc', 'npc'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? 'seg-item seg-on' : 'seg-item'}
              onClick={() => setKind(k)}
            >
              {k === 'pc' ? 'Personaje jugador' : 'PNJ'}
            </button>
          ))}
        </div>
      </div>
      <div className="field-row">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="nc-class">Clase</label>
          <select id="nc-class" className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Sin clase (la defino después)</option>
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="nc-level">Nivel</label>
          <input
            id="nc-level"
            className="input"
            type="number"
            min={1}
            max={20}
            value={level}
            disabled={!classId}
            onChange={(e) => setLevel(Number(e.target.value) || 1)}
          />
        </div>
      </div>
      <p className="muted small">Con clase se aplican automáticamente las salvaciones, el dado de golpe y los PG promedio.</p>
      {error && <p className="error-text">{error}</p>}
    </Dialog>
  );
}
