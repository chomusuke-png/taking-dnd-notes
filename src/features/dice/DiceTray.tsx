import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import type { RollMode } from '../../rules/dice';
import { useDice, type RollEntry } from './diceStore';
import './dice.css';

const MODES: { mode: RollMode; label: string; title: string }[] = [
  { mode: 'disadvantage', label: 'Desv.', title: 'La próxima tirada de d20 con desventaja' },
  { mode: 'normal', label: 'Normal', title: 'Tirada normal' },
  { mode: 'advantage', label: 'Vent.', title: 'La próxima tirada de d20 con ventaja' },
];

/** Bandeja flotante: muestra la última tirada, el historial y permite tiradas libres. */
export function DiceTray() {
  const { log, last, mode, setMode, expr, clear } = useDice();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<RollEntry | undefined>();
  const [input, setInput] = useState('');

  // La última tirada aparece unos segundos aunque la bandeja esté cerrada.
  useEffect(() => {
    if (!last) return;
    setFlash(last);
    const t = setTimeout(() => setFlash(undefined), 4000);
    return () => clearTimeout(t);
  }, [last]);

  return (
    <div className="dice-tray">
      {open && (
        <div className="dice-panel" role="dialog" aria-label="Tiradas de dados">
          <div className="dice-panel-head">
            <strong>Tiradas</strong>
            <div className="seg" role="radiogroup" aria-label="Modo de la próxima tirada">
              {MODES.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.mode}
                  className={mode === m.mode ? 'seg-item seg-on' : 'seg-item'}
                  title={m.title}
                  onClick={() => setMode(m.mode)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <form
            className="dice-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && expr('', input.trim(), input)) setInput('');
            }}
          >
            <input
              className="input"
              placeholder="2d6+3, d20, 8d6…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Tirada libre"
            />
            <button className="btn btn-primary" type="submit">
              Tirar
            </button>
          </form>
          <ol className="dice-log">
            {log.length === 0 && <li className="muted dice-empty">Haz clic en una característica, habilidad o ataque para tirar.</li>}
            {log.map((r) => (
              <RollRow key={r.id} r={r} />
            ))}
          </ol>
          {log.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              Limpiar historial
            </button>
          )}
        </div>
      )}

      {!open && flash && (
        <button type="button" className="dice-flash" onClick={() => setOpen(true)}>
          <RollRow r={flash} />
        </button>
      )}

      <button
        type="button"
        className={`dice-fab${mode !== 'normal' ? ' dice-fab-mode' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Tiradas de dados"
      >
        <Icon name="dice" />
        {mode === 'advantage' ? ' V' : mode === 'disadvantage' ? ' D' : ''}
      </button>
    </div>
  );
}

function RollRow({ r }: { r: RollEntry }) {
  return (
    <li className="roll">
      <div className="roll-text">
        <span className="roll-label">
          {r.who && <span className="muted">{r.who} · </span>}
          {r.label}
        </span>
        <span className="roll-detail muted">{r.detail}</span>
      </div>
      <span className={`roll-total${r.crit ? ` roll-${r.crit}` : ''}`} title={r.crit === 'success' ? '¡20 natural!' : r.crit === 'fail' ? '1 natural' : undefined}>
        {r.total}
      </span>
    </li>
  );
}
