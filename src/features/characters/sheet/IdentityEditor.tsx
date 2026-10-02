import type { ReactNode } from 'react';
import { NumberField, TextField } from '../../../components/fields';
import type { CharacterClass, HitDie } from '../../../db/types';
import { CASTER_SUBCLASSES, CLASSES, getClass } from '../../../rules/classes';
import { averageHp, savingThrowsForClass, totalLevel } from '../../../rules/derive';
import { useSheet } from './SheetContext';

const ALIGNMENTS = [
  'Legal bueno', 'Neutral bueno', 'Caótico bueno',
  'Legal neutral', 'Neutral', 'Caótico neutral',
  'Legal malvado', 'Neutral malvado', 'Caótico malvado',
];

/** Datos de identidad y clases; solo visible en modo edición. */
export function IdentityEditor() {
  const { c, update } = useSheet();
  const set = <K extends keyof typeof c>(key: K) => (value: (typeof c)[K]) => update((x) => ({ ...x, [key]: value }));

  const setClasses = (fn: (list: CharacterClass[]) => CharacterClass[]) => update((x) => ({ ...x, classes: fn(x.classes) }));
  const level = totalLevel(c);
  const firstSaves = c.classes[0] ? savingThrowsForClass(c.classes[0].classId) : [];
  const savesMatch = firstSaves.length > 0 && [...firstSaves].sort().join() === [...c.proficiencies.saves].sort().join();

  return (
    <section className="identity-editor card">
      <div className="identity-grid">
        <Labeled label="Nombre">
          <TextField value={c.name} onCommit={(v) => v && set('name')(v)} />
        </Labeled>
        <Labeled label="Jugador">
          <TextField value={c.player} onCommit={set('player')} />
        </Labeled>
        <Labeled label="Raza">
          <TextField value={c.race} onCommit={set('race')} placeholder="Enano" />
        </Labeled>
        <Labeled label="Subraza">
          <TextField value={c.subrace} onCommit={set('subrace')} placeholder="de las colinas" />
        </Labeled>
        <Labeled label="Trasfondo">
          <TextField value={c.background} onCommit={set('background')} placeholder="Soldado" />
        </Labeled>
        <Labeled label="Alineamiento">
          <TextField value={c.alignment} onCommit={set('alignment')} list="alignments" />
          <datalist id="alignments">
            {ALIGNMENTS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Labeled>
        <Labeled label="Velocidad (pies)">
          <NumberField value={c.speed} min={0} max={200} onCommit={set('speed')} />
        </Labeled>
        <Labeled label="Tipo">
          <select className="input" value={c.kind} onChange={(e) => set('kind')(e.target.value as typeof c.kind)}>
            <option value="pc">Personaje jugador</option>
            <option value="npc">PNJ</option>
          </select>
        </Labeled>
      </div>

      <h3 className="editor-subtitle">
        Clases <span className="muted small">· nivel total {level}</span>
      </h3>
      <div className="class-rows">
        {c.classes.map((cls, i) => {
          const subOptions = Object.entries(CASTER_SUBCLASSES).filter(([, s]) => s.classId === cls.classId);
          const patch = (p: Partial<CharacterClass>) => setClasses((list) => list.map((x, j) => (j === i ? { ...x, ...p } : x)));
          return (
            <div className="class-row" key={i}>
              <select
                className="input"
                aria-label="Clase"
                value={cls.classId}
                onChange={(e) => {
                  const info = getClass(e.target.value);
                  patch({ classId: e.target.value, subclassId: undefined, hitDie: info?.hitDie ?? cls.hitDie });
                }}
              >
                {CLASSES.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
              <input
                className="input"
                aria-label="Subclase"
                placeholder="Subclase"
                list={`sub-${i}`}
                defaultValue={cls.subclassId ?? ''}
                key={`${cls.classId}-${cls.subclassId ?? ''}`}
                onBlur={(e) => patch({ subclassId: e.target.value.trim() || undefined })}
              />
              <datalist id={`sub-${i}`}>
                {subOptions.map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.name}
                  </option>
                ))}
              </datalist>
              <label className="inline-label">
                Nv
                <NumberField
                  value={cls.level}
                  min={1}
                  max={20}
                  onCommit={(v) => patch({ level: v })}
                  className="input input-xs"
                  aria-label="Nivel"
                />
              </label>
              <select
                className="input input-xs"
                aria-label="Dado de golpe"
                value={cls.hitDie}
                onChange={(e) => patch({ hitDie: Number(e.target.value) as HitDie })}
              >
                {[6, 8, 10, 12].map((d) => (
                  <option key={d} value={d}>
                    d{d}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-danger"
                aria-label="Quitar clase"
                onClick={() => setClasses((list) => list.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <div className="editor-actions">
        <button
          type="button"
          className="btn btn-sm"
          disabled={level >= 20}
          onClick={() =>
            setClasses((list) => [...list, { classId: 'fighter', level: 1, hitDie: 10 }])
          }
        >
          ＋ {c.classes.length ? 'Multiclase' : 'Agregar clase'}
        </button>
        {firstSaves.length > 0 && !savesMatch && (
          <button
            type="button"
            className="btn btn-sm"
            title="Al multiclasear solo cuentan las salvaciones de la primera clase"
            onClick={() => update((x) => ({ ...x, proficiencies: { ...x.proficiencies, saves: [...firstSaves] } }))}
          >
            Usar salvaciones de {getClass(c.classes[0].classId)?.name}
          </button>
        )}
        {c.classes.length > 0 && c.hp.max !== averageHp(c) && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              update((x) => {
                const max = averageHp(x);
                return { ...x, hp: { ...x.hp, max, current: Math.min(max, x.hp.current || max) } };
              })
            }
          >
            PG máx. promedio: {averageHp(c)}
          </button>
        )}
      </div>
      {level > 20 && <p className="error-text">El nivel total no puede pasar de 20.</p>}
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
