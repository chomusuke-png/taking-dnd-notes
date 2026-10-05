import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/Dialog';
import { TextField } from '../../components/fields';
import { QuickHp } from '../../components/QuickHp';
import { db } from '../../db/db';
import { deleteEncounter, duplicateEncounter, updateEncounter } from '../../db/encounters';
import { CONDITIONS, type Character, type Combatant, type Condition, type Encounter, type Id } from '../../db/types';
import { armorClass, formatMod, totalLevel } from '../../rules/derive';
import {
  addCombatants, damageCombatant, encounterDifficulty, endEncounter, healCombatant, isCharacter, nextTurn, patchCombatant,
  previousTurn, removeCombatant, rollInitiatives, sortCombatants, startEncounter, xpPerCharacter, type Difficulty,
} from '../../rules/encounter';
import { CONDITION_LABEL } from '../../rules/labels';
import { useSrdIndex, type SrdMonster } from '../../srd';
import { useUi } from '../../store/ui';
import { damageCharacter, healCharacter, toggleCharacterCondition } from '../characters/hpActions';
import { MonsterStatBlock } from '../compendium/details';
import { AddCombatants } from './AddCombatants';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  none: 'Sin calcular', trivial: 'Trivial', easy: 'Fácil', medium: 'Media', hard: 'Difícil', deadly: 'Mortal',
};

/** Combatiente con los valores vivos: para personajes, los de su hoja. */
interface Row {
  cb: Combatant;
  character?: Character;
  monster?: SrdMonster;
  hp: number;
  maxHp: number;
  temp: number;
  ac: number;
  conditions: Condition[];
  out: boolean;
}

export function EncounterView({ encounterId, campaignId }: { encounterId: Id; campaignId: Id }) {
  const enc = useLiveQuery(async () => (await db.encounters.get(encounterId)) ?? null, [encounterId]);
  const characters = useLiveQuery(() => db.characters.where('campaignId').equals(campaignId).sortBy('name'), [campaignId]);
  const monsters = useSrdIndex('monsters');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();
  const toast = useUi((s) => s.toast);

  const rows = useMemo<Row[]>(() => {
    if (!enc) return [];
    const byId = new Map(characters?.map((c) => [c.id, c]));
    return sortCombatants(enc.combatants).map((cb) => {
      if (cb.ref.type === 'character') {
        const c = byId.get(cb.ref.id);
        if (c) {
          return { cb, character: c, hp: c.hp.current, maxHp: c.hp.max, temp: c.hp.temp, ac: armorClass(c), conditions: c.conditions, out: c.deathSaves.fail >= 3 };
        }
      }
      const monster = cb.ref.type === 'srdMonster' ? monsters?.get(cb.ref.id) : undefined;
      return { cb, monster, hp: cb.hp, maxHp: cb.maxHp, temp: cb.tempHp, ac: cb.ac, conditions: cb.conditions, out: cb.hp <= 0 };
    });
  }, [enc, characters, monsters]);

  const party = useMemo(() => (characters ?? []).filter((c) => c.kind === 'pc'), [characters]);
  const monsterXps = rows.flatMap((r) => (r.monster ? [r.monster.xp] : []));
  const difficulty = encounterDifficulty(party.map(totalLevel), monsterXps);

  if (enc === undefined) return null;
  if (enc === null) {
    return (
      <div className="placeholder">
        <h2>Encuentro no encontrado</h2>
        <Link className="btn" to={`/c/${campaignId}/encuentros`}>
          ← Volver
        </Link>
      </div>
    );
  }

  const change = (fn: (e: Encounter) => Encounter) => void updateEncounter(enc.id, fn);
  const running = enc.round > 0 && !enc.ended;
  const focus = rows.find((r) => r.cb.id === (focusId ?? enc.activeId)) ?? rows.find((r) => r.monster);

  function damage(row: Row, n: number) {
    if (row.character) return void damageCharacter(row.character.id, n);
    change((e) => {
      const cb = e.combatants.find((x) => x.id === row.cb.id);
      if (!cb) return e;
      const next = damageCombatant(cb, n);
      if (cb.hp > 0 && next.hp === 0) toast(`${cb.name} derrotado.`);
      return patchCombatant(e, cb.id, next);
    });
  }
  function healRow(row: Row, n: number) {
    if (row.character) return void healCharacter(row.character.id, n);
    change((e) => {
      const cb = e.combatants.find((x) => x.id === row.cb.id);
      return cb ? patchCombatant(e, cb.id, healCombatant(cb, n)) : e;
    });
  }
  function toggleCondition(row: Row, cond: Condition) {
    if (row.character) return void toggleCharacterCondition(row.character.id, cond);
    const has = row.conditions.includes(cond);
    change((e) => patchCombatant(e, row.cb.id, { conditions: has ? row.conditions.filter((c) => c !== cond) : [...row.conditions, cond] }));
  }
  function bulk(kind: 'damage' | 'heal', n: number) {
    for (const r of rows.filter((x) => selected.has(x.cb.id))) (kind === 'damage' ? damage : healRow)(r, n);
  }

  const defeatedXp = rows.flatMap((r) => (r.monster && r.out ? [r.monster.xp] : []));

  return (
    <div className="encounter">
      <header className="encounter-header">
        <Link to={`/c/${campaignId}/encuentros`} className="muted encounter-back">
          ← Encuentros
        </Link>
        <TextField className="note-title-input" aria-label="Nombre del encuentro" value={enc.name} onCommit={(name) => name && change((e) => ({ ...e, name }))} />
        <div className="encounter-meta">
          <span
            className={`difficulty difficulty-${difficulty.rating}`}
            title={`PX ${difficulty.totalXp} × ${difficulty.multiplier} = ${difficulty.adjustedXp} ajustados · Umbrales del grupo: fácil ${difficulty.thresholds.easy}, media ${difficulty.thresholds.medium}, difícil ${difficulty.thresholds.hard}, mortal ${difficulty.thresholds.deadly}`}
          >
            {DIFFICULTY_LABEL[difficulty.rating]}
            {difficulty.rating !== 'none' && <span className="muted"> · {difficulty.adjustedXp} PX aj.</span>}
          </span>
          <span className="muted small">
            {party.length} PJ (niv. {party.map(totalLevel).join(', ') || '—'})
          </span>
        </div>
      </header>

      <div className="encounter-toolbar">
        {enc.round === 0 || enc.ended ? (
          <>
            <button type="button" className="btn btn-sm" disabled={rows.length === 0} onClick={() => change((e) => rollInitiatives(e, 'missing'))}>
              <Icon name="d20" /> Tirar iniciativa faltante
            </button>
            <button type="button" className="btn btn-sm btn-primary" disabled={rows.length === 0} onClick={() => change((e) => startEncounter(rollInitiatives(e, 'missing')))}>
              ▶ {enc.ended ? 'Reanudar' : 'Comenzar combate'}
            </button>
          </>
        ) : (
          <>
            <span className="round-badge">Ronda {enc.round}</span>
            <button type="button" className="btn btn-sm" onClick={() => change(previousTurn)} title="Turno anterior">
              ◀
            </button>
            <button type="button" className="btn btn-primary" onClick={() => change(nextTurn)}>
              Siguiente turno ▶
            </button>
            <button type="button" className="btn btn-sm" onClick={() => change(endEncounter)}>
              ⏹ Terminar
            </button>
          </>
        )}
        <span className="toolbar-spacer" />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            const copy = await duplicateEncounter(enc.id);
            if (copy) navigate(`/c/${campaignId}/encuentros/${copy.id}`);
          }}
        >
          Duplicar
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
          Eliminar
        </button>
      </div>

      {enc.ended && defeatedXp.length > 0 && (
        <p className="encounter-xp card">
          <Icon name="trophy" /> Monstruos derrotados: {defeatedXp.reduce((a, b) => a + b, 0)} PX en total ·{' '}
          <strong>{xpPerCharacter(defeatedXp, party.length)} PX por personaje</strong> ({party.length} PJ)
        </p>
      )}

      <div className="encounter-layout">
        <div className="encounter-main">
          <AddCombatants enc={enc} characters={characters ?? []} onAdd={(list) => change((e) => addCombatants(e, list))} />

          {selected.size > 0 && (
            <div className="bulk-bar">
              <span>{selected.size} seleccionados</span>
              <QuickHp label="los seleccionados" onDamage={(n) => bulk('damage', n)} onHeal={(n) => bulk('heal', n)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
                Quitar selección
              </button>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="muted empty-inline">Agrega monstruos, personajes u otros combatientes para empezar.</p>
          ) : (
            <ol className="initiative-list">
              {rows.map((r) => (
                <CombatantRow
                  key={r.cb.id}
                  row={r}
                  campaignId={campaignId}
                  active={running && r.cb.id === enc.activeId}
                  focused={focus?.cb.id === r.cb.id}
                  selected={selected.has(r.cb.id)}
                  onSelect={(on) => setSelected((s) => {
                    const n = new Set(s);
                    if (on) n.add(r.cb.id);
                    else n.delete(r.cb.id);
                    return n;
                  })}
                  onFocus={() => setFocusId(r.cb.id)}
                  onInitiative={(v) => change((e) => patchCombatant(e, r.cb.id, { initiative: v }))}
                  onDamage={(n) => damage(r, n)}
                  onHeal={(n) => healRow(r, n)}
                  onToggleCondition={(cond) => toggleCondition(r, cond)}
                  onRemove={() => change((e) => removeCombatant(e, r.cb.id))}
                />
              ))}
            </ol>
          )}
        </div>

        <aside className="encounter-side">
          {focus?.monster ? (
            <div className="card">
              <MonsterStatBlock monster={focus.monster} />
            </div>
          ) : focus?.character ? (
            <div className="card">
              <h3 className="side-title">{focus.character.name}</h3>
              <p className="muted small">
                CA {focus.ac} · PG {focus.hp}/{focus.maxHp} · Iniciativa {formatMod(focus.cb.initBonus)}
              </p>
              <Link className="btn btn-sm" to={`/c/${campaignId}/personajes/${focus.character.id}`}>
                Abrir hoja →
              </Link>
            </div>
          ) : (
            <p className="muted small">Elige un monstruo de la lista para ver su bloque de estadísticas.</p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar encuentro"
        danger
        confirmLabel="Eliminar"
        message={<p>Se eliminará <strong>{enc.name}</strong>. Los personajes no se ven afectados.</p>}
        onConfirm={() => {
          navigate(`/c/${campaignId}/encuentros`);
          void deleteEncounter(enc.id);
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

interface RowProps {
  row: Row;
  campaignId: Id;
  active: boolean;
  focused: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onFocus: () => void;
  onInitiative: (v: number | null) => void;
  onDamage: (n: number) => void;
  onHeal: (n: number) => void;
  onToggleCondition: (c: Condition) => void;
  onRemove: () => void;
}

function CombatantRow({ row, active, focused, selected, onSelect, onFocus, onInitiative, onDamage, onHeal, onToggleCondition, onRemove }: RowProps) {
  const [condOpen, setCondOpen] = useState(false);
  const { cb, hp, maxHp, temp, ac, conditions, out } = row;
  const pct = maxHp > 0 ? Math.min(100, (hp / maxHp) * 100) : 0;
  const pc = isCharacter(cb);

  return (
    <li className={`combatant${active ? ' is-active' : ''}${out ? ' is-out' : ''}${focused ? ' is-focused' : ''}`} aria-current={active ? 'step' : undefined}>
      <input type="checkbox" className="combatant-check" checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`Seleccionar ${cb.name}`} />
      <input
        className="input init-input"
        inputMode="numeric"
        aria-label={`Iniciativa de ${cb.name}`}
        title={`Bono ${formatMod(cb.initBonus)}`}
        placeholder="—"
        defaultValue={cb.initiative ?? ''}
        key={cb.initiative ?? 'none'}
        onBlur={(e) => {
          const v = e.target.value.trim() === '' ? null : parseInt(e.target.value, 10);
          if (v !== cb.initiative && (v === null || Number.isFinite(v))) onInitiative(v);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <button type="button" className="combatant-name" onClick={onFocus}>
        <Icon name={pc ? 'characters' : cb.ref.type === 'srdMonster' ? 'monster' : 'custom'} />
        <span className="combatant-name-text">{cb.name}</span>
        {out && <span className="muted small">{pc ? <Icon name="dead" label="Muerto" /> : 'derrotado'}</span>}
        {pc && hp === 0 && !out && <span className="small dying">a 0 PG</span>}
      </button>
      <span className="combatant-ac" title="Clase de armadura">
        <Icon name="armorClass" /> {ac}
      </span>
      <span className="combatant-hp">
        <span className="combatant-hp-text">
          <strong>{hp}</strong>/{maxHp}
          {temp > 0 && <span className="hp-temp-sm"> +{temp}</span>}
        </span>
        <span className="hp-bar" aria-hidden>
          <span className="hp-bar-fill" style={{ width: `${pct}%`, display: 'block' }} data-low={pct <= 25} />
        </span>
      </span>
      <QuickHp label={cb.name} onDamage={onDamage} onHeal={onHeal} />
      <div className="combatant-conds">
        {conditions.map((c) => (
          <button key={c} type="button" className="chip chip-on chip-xs" title="Quitar" onClick={() => onToggleCondition(c)}>
            {CONDITION_LABEL[c]} ✕
          </button>
        ))}
        <button type="button" className="chip chip-xs" aria-expanded={condOpen} onClick={() => setCondOpen((o) => !o)} title="Condiciones">
          ＋
        </button>
        {condOpen && (
          <div className="cond-menu">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={conditions.includes(c) ? 'chip chip-on chip-xs' : 'chip chip-xs'}
                onClick={() => {
                  onToggleCondition(c);
                  setCondOpen(false);
                }}
              >
                {CONDITION_LABEL[c]}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="btn btn-ghost btn-sm btn-danger combatant-remove" aria-label={`Quitar a ${cb.name} del encuentro`} onClick={onRemove}>
        ✕
      </button>
    </li>
  );
}
