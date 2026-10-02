import { useMemo, useState } from 'react';
import { Pips } from '../../../components/fields';
import type { CharacterClass } from '../../../db/types';
import { fold } from '../../../lib/text';
import { casterOf, getClass } from '../../../rules/classes';
import { formatMod, mod, spellcastingStats, type SpellcastingStats } from '../../../rules/derive';
import { ABILITY_LABEL } from '../../../rules/labels';
import { pactSlots, spellSlots } from '../../../rules/spellSlots';
import {
  addSpell, castOptions, casterClasses, preparedLimit, removeSpell, spellListClass, spellRoll, spendSlot, togglePrepared,
  type CastOption,
} from '../../../rules/spells';
import { useSrd, useSrdIndex, type SrdSpell } from '../../../srd';
import { SAVE_ABILITY_LABEL, SPELL_LEVEL_LABEL } from '../../../srd/labels';
import { useUi } from '../../../store/ui';
import { SpellDetail } from '../../compendium/details';
import { useSheet } from './SheetContext';

const ORDINAL = ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º', '7.º', '8.º', '9.º'];

export function SpellsTab() {
  const { c, update, check } = useSheet();
  const stats = spellcastingStats(c);
  const slots = spellSlots(c.classes);
  const pact = pactSlots(c.classes);
  const spells = useSrdIndex('spells');

  if (stats.length === 0) {
    return <p className="muted empty-inline">Este personaje no tiene clases lanzadoras de conjuros.</p>;
  }

  const setUsed = (level: number, used: number) =>
    update((x) => ({
      ...x,
      spellcasting: { ...x.spellcasting, slotsUsed: x.spellcasting.slotsUsed.map((u, i) => (i === level ? used : u)) },
    }));

  return (
    <div className="spells">
      <div className="caster-cards">
        {stats.map((s) => (
          <div key={s.ability} className="caster-card">
            <span className="muted small">{getClass(s.classId)?.name}</span>
            <div className="caster-stats">
              <div>
                <span className="vital-label">Característica</span>
                <strong>{ABILITY_LABEL[s.ability].short}</strong>
              </div>
              <div>
                <span className="vital-label">CD</span>
                <strong>{s.saveDc}</strong>
              </div>
              <button type="button" className="rollable" onClick={() => check('Ataque de conjuro', s.attack)}>
                <span className="vital-label">Ataque</span>
                <strong>{formatMod(s.attack)}</strong>
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="panel-title">Espacios de conjuro</h3>
      <ul className="slot-list">
        {slots.map((max, i) =>
          max > 0 ? (
            <li key={i}>
              <span>Nivel {ORDINAL[i]}</span>
              <Pips total={max} used={Math.min(max, c.spellcasting.slotsUsed[i] ?? 0)} label={`Espacio de nivel ${i + 1} gastado`} onChange={(u) => setUsed(i, u)} />
              <span className="muted small">
                {max - Math.min(max, c.spellcasting.slotsUsed[i] ?? 0)}/{max}
              </span>
            </li>
          ) : null,
        )}
        {pact.count > 0 && (
          <li className="pact-row">
            <span>Pacto (nv {ORDINAL[pact.level - 1]})</span>
            <Pips
              total={pact.count}
              used={Math.min(pact.count, c.spellcasting.pactSlotsUsed)}
              label="Espacio de pacto gastado"
              onChange={(u) => update((x) => ({ ...x, spellcasting: { ...x.spellcasting, pactSlotsUsed: u } }))}
            />
            <span className="muted small">Descanso corto</span>
          </li>
        )}
        {slots.every((s) => s === 0) && pact.count === 0 && <li className="muted small">Aún sin espacios de conjuro a este nivel.</li>}
      </ul>

      {casterClasses(c).map((cls) => (
        <ClassSpellList
          key={cls.classId}
          cls={cls}
          spells={spells}
          stats={stats.find((s) => s.ability === casterOf(cls).spellAbility)}
        />
      ))}
    </div>
  );
}

function ClassSpellList({ cls, spells, stats }: { cls: CharacterClass; spells?: Map<string, SrdSpell>; stats?: SpellcastingStats }) {
  const { c, edit, update } = useSheet();
  const [adding, setAdding] = useState(false);
  const entry = c.spellcasting.entries.find((e) => e.classId === cls.classId);
  const limit = preparedLimit(c, cls);
  const preparedIds = new Set(entry?.prepared.map((r) => r.id));

  const known = (entry?.known ?? [])
    .map((r) => spells?.get(r.id))
    .filter((s): s is SrdSpell => !!s)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const preparedCount = known.filter((s) => s.level > 0 && preparedIds.has(s.id)).length;
  const byLevel = new Map<number, SrdSpell[]>();
  for (const s of known) byLevel.set(s.level, [...(byLevel.get(s.level) ?? []), s]);

  return (
    <section className="class-spells">
      <h3 className="panel-title">
        <span>
          Conjuros de {getClass(cls.classId)?.name}
          {limit !== undefined && (
            <span className={`muted small${preparedCount > limit ? ' over-limit' : ''}`}>
              {' '}
              · preparados {preparedCount}/{limit}
            </span>
          )}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          {adding ? 'Cerrar' : '＋ Agregar'}
        </button>
      </h3>

      {adding && <SpellPicker listClass={spellListClass(cls)} knownIds={new Set(entry?.known.map((r) => r.id))} onPick={(id) => update((x) => addSpell(x, cls.classId, id))} />}

      {!spells && (entry?.known.length ?? 0) > 0 && <p className="muted small">Cargando conjuros…</p>}
      {spells && known.length === 0 && !adding && (
        <p className="muted small">Sin conjuros. Usa ＋ Agregar o el compendio para sumarlos.</p>
      )}

      {[...byLevel.entries()].map(([level, list]) => (
        <div key={level} className="spell-level-group">
          <h4 className="spell-level-title">{SPELL_LEVEL_LABEL(level)}</h4>
          <ul className="spell-list">
            {list.map((s) => (
              <SpellRow
                key={s.id}
                spell={s}
                prepares={limit !== undefined && s.level > 0}
                prepared={preparedIds.has(s.id)}
                stats={stats}
                onTogglePrepared={() => update((x) => togglePrepared(x, cls.classId, s.id))}
                onRemove={edit ? () => update((x) => removeSpell(x, cls.classId, s.id)) : undefined}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function SpellRow({
  spell, prepares, prepared, stats, onTogglePrepared, onRemove,
}: {
  spell: SrdSpell;
  prepares: boolean;
  prepared: boolean;
  stats?: SpellcastingStats;
  onTogglePrepared: () => void;
  onRemove?: () => void;
}) {
  const { c, update, check, rollExpr } = useSheet();
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const toast = useUi((s) => s.toast);
  const options = castOptions(c, spell.level);

  function cast(opt?: CastOption) {
    setChoosing(false);
    if (opt) update((x) => spendSlot(x, opt));
    const level = opt?.level ?? spell.level;
    const suffix = spell.level > 0 && level > spell.level ? ` (nv ${level})` : '';
    if (spell.attackType && stats) check(`${spell.name}${suffix}: ataque`, stats.attack);
    const r = spellRoll(spell, level, c, stats ? mod(c, stats.ability) : 0);
    const save = spell.save && stats ? ` · CD ${stats.saveDc} ${SAVE_ABILITY_LABEL[spell.save.ability] ?? ''}` : '';
    if (r) rollExpr(`${spell.name}${suffix}: ${r.kind === 'heal' ? 'curación' : 'daño'}${save}`, r.expression);
    else if (opt) toast(`${spell.name} lanzado con un espacio de nivel ${level}${save}.`);
  }

  function onCast() {
    if (spell.level === 0) return cast();
    const available = options.filter((o) => o.available > 0);
    if (available.length === 0) return toast('No quedan espacios para lanzar este conjuro.', 'error');
    if (available.length === 1) return cast(available[0]);
    setChoosing((v) => !v);
  }

  return (
    <li className={`spell-row${prepares && !prepared ? ' is-unprepared' : ''}`}>
      <div className="spell-row-main">
        {prepares ? (
          <button
            type="button"
            className={`prep-toggle${prepared ? ' is-on' : ''}`}
            aria-pressed={prepared}
            title={prepared ? 'Preparado' : 'No preparado'}
            onClick={onTogglePrepared}
          >
            {prepared ? '●' : '○'}
          </button>
        ) : (
          <span className="prep-toggle" aria-hidden />
        )}
        <button type="button" className="spell-name" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {spell.name}
          {spell.concentration && <span className="spell-flag" title="Concentración">C</span>}
          {spell.ritual && <span className="spell-flag" title="Ritual">R</span>}
        </button>
        <span className="muted small spell-meta">{spell.castingTime}</span>
        <button type="button" className="roll-btn" onClick={onCast} title={spell.level === 0 ? 'Lanzar' : 'Lanzar gastando un espacio'}>
          Lanzar
        </button>
        {onRemove && (
          <button type="button" className="btn btn-ghost btn-sm btn-danger" aria-label={`Quitar ${spell.name}`} onClick={onRemove}>
            ✕
          </button>
        )}
      </div>
      {choosing && (
        <div className="cast-options" role="group" aria-label="Elegir espacio">
          <span className="muted small">Espacio:</span>
          {options.map((o) => (
            <button key={`${o.kind}-${o.level}`} type="button" className="btn btn-sm" disabled={o.available <= 0} onClick={() => cast(o)}>
              {o.kind === 'pact' ? 'Pacto ' : ''}nv {o.level} <span className="muted">({o.available})</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="spell-detail-inline">
          <SpellDetail spell={spell} compact />
        </div>
      )}
    </li>
  );
}

function SpellPicker({ listClass, knownIds, onPick }: { listClass: string; knownIds: Set<string>; onPick: (id: string) => void }) {
  const all = useSrd('spells');
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const results = useMemo(() => {
    const f = fold(q.trim());
    return (all ?? [])
      .filter((s) => s.classes.includes(listClass) && (level === '' || s.level === Number(level)) && (!f || fold(s.name).includes(f)))
      .slice(0, 40);
  }, [all, q, level, listClass]);

  return (
    <div className="spell-picker card">
      <div className="spell-picker-filters">
        <input className="input input-sm" autoFocus placeholder={`Buscar en la lista de ${getClass(listClass)?.name ?? listClass}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar conjuro" />
        <select className="input input-sm" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Nivel">
          <option value="">Todos</option>
          {Array.from({ length: 10 }, (_, l) => (
            <option key={l} value={l}>
              {SPELL_LEVEL_LABEL(l)}
            </option>
          ))}
        </select>
      </div>
      {!all ? (
        <p className="muted small">Cargando compendio…</p>
      ) : (
        <ul className="spell-picker-list">
          {results.map((s) => {
            const has = knownIds.has(s.id);
            return (
              <li key={s.id}>
                <button type="button" className="spell-picker-item" disabled={has} onClick={() => onPick(s.id)}>
                  <span>{s.name}</span>
                  <span className="muted small">{has ? 'Ya agregado' : SPELL_LEVEL_LABEL(s.level)}</span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li className="muted small">Sin resultados.</li>}
        </ul>
      )}
    </div>
  );
}
