import { useMemo, useState } from 'react';
import type { Character, Combatant, Encounter } from '../../db/types';
import { fold } from '../../lib/text';
import { characterCombatant, customCombatant, monsterCombatants } from '../../rules/encounter';
import { useSrd } from '../../srd';
import { MONSTER_TYPE_LABEL, formatCr, label } from '../../srd/labels';

type Mode = 'monsters' | 'characters' | 'custom';

interface Props {
  enc: Encounter;
  characters: Character[];
  onAdd: (list: Combatant[]) => void;
}

/** Panel para sumar monstruos del SRD, personajes de la campaña o combatientes libres. */
export function AddCombatants({ enc, characters, onAdd }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  return (
    <div className="add-combatants">
      <div className="add-combatants-buttons">
        {(
          [
            ['monsters', '🐉 Monstruos'],
            ['characters', '🧙 Personajes'],
            ['custom', '✏️ Otro'],
          ] as const
        ).map(([m, text]) => (
          <button key={m} type="button" className={mode === m ? 'btn btn-sm btn-primary' : 'btn btn-sm'} onClick={() => setMode(mode === m ? null : m)}>
            ＋ {text}
          </button>
        ))}
      </div>
      {mode === 'monsters' && <AddMonsters enc={enc} onAdd={onAdd} />}
      {mode === 'characters' && <AddCharacters enc={enc} characters={characters} onAdd={(l) => { onAdd(l); setMode(null); }} />}
      {mode === 'custom' && <AddCustom onAdd={(l) => { onAdd(l); setMode(null); }} />}
    </div>
  );
}

function AddMonsters({ enc, onAdd }: { enc: Encounter; onAdd: (l: Combatant[]) => void }) {
  const monsters = useSrd('monsters');
  const [q, setQ] = useState('');
  const [count, setCount] = useState(1);
  const [rollHp, setRollHp] = useState(false);
  const results = useMemo(() => {
    const f = fold(q.trim());
    if (!monsters) return [];
    return (f ? monsters.filter((m) => fold(m.name).includes(f)) : monsters).slice(0, 30);
  }, [monsters, q]);

  return (
    <div className="add-panel card">
      <div className="add-panel-row">
        <input className="input input-sm" autoFocus placeholder="Buscar monstruo (Goblin, Orc, Wolf…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar monstruo" />
        <label className="inline-label">
          Cantidad
          <input className="input input-xs" type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="checkbox small" title="Si no, se usan los PG promedio del bestiario">
          <input type="checkbox" checked={rollHp} onChange={(e) => setRollHp(e.target.checked)} />
          Tirar PG
        </label>
      </div>
      {!monsters ? (
        <p className="muted small">Cargando bestiario…</p>
      ) : (
        <ul className="add-results">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onAdd(monsterCombatants(enc, m, count, rollHp))}>
                <span>{m.name}</span>
                <span className="muted small">
                  VD {formatCr(m.cr)} · {label(MONSTER_TYPE_LABEL, m.type)} · CA {m.ac} · {m.hp} PG
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="muted small">Sin resultados.</li>}
        </ul>
      )}
    </div>
  );
}

function AddCharacters({ enc, characters, onAdd }: { enc: Encounter; characters: Character[]; onAdd: (l: Combatant[]) => void }) {
  const inEncounter = new Set(enc.combatants.flatMap((cb) => (cb.ref.type === 'character' ? [cb.ref.id] : [])));
  const available = characters.filter((c) => !inEncounter.has(c.id));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(available.filter((c) => c.kind === 'pc').map((c) => c.id)));

  if (available.length === 0) {
    return <p className="add-panel card muted small">Todos los personajes de la campaña ya están en el encuentro (o aún no hay personajes).</p>;
  }
  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <div className="add-panel card">
      <ul className="add-characters">
        {available.map((c) => (
          <li key={c.id}>
            <label className="checkbox">
              <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
              {c.name} {c.kind === 'npc' && <span className="muted small">(PNJ)</span>}
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={picked.size === 0}
        onClick={() => onAdd(available.filter((c) => picked.has(c.id)).map(characterCombatant))}
      >
        Agregar {picked.size}
      </button>
    </div>
  );
}

function AddCustom({ onAdd }: { onAdd: (l: Combatant[]) => void }) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(10);
  const [ac, setAc] = useState(12);
  const [init, setInit] = useState(0);
  return (
    <form
      className="add-panel card add-custom"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onAdd([customCombatant({ name: name.trim(), hp, ac, initBonus: init })]);
      }}
    >
      <label className="field">
        <span className="field-label">Nombre</span>
        <input className="input input-sm" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Capitán bandido" />
      </label>
      <label className="field">
        <span className="field-label">PG</span>
        <input className="input input-sm" type="number" min={1} value={hp} onChange={(e) => setHp(Math.max(1, Number(e.target.value) || 1))} />
      </label>
      <label className="field">
        <span className="field-label">CA</span>
        <input className="input input-sm" type="number" min={0} value={ac} onChange={(e) => setAc(Number(e.target.value) || 0)} />
      </label>
      <label className="field">
        <span className="field-label">Bono init.</span>
        <input className="input input-sm" type="number" value={init} onChange={(e) => setInit(Number(e.target.value) || 0)} />
      </label>
      <button type="submit" className="btn btn-sm btn-primary" disabled={!name.trim()}>
        Agregar
      </button>
    </form>
  );
}
