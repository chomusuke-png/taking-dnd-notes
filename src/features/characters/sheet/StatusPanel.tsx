import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { ConfirmDialog, Dialog } from '../../../components/Dialog';
import { NumberField, Pips } from '../../../components/fields';
import { CONDITIONS, type ArmorConfig, type Character, type HitDie } from '../../../db/types';
import { armorClass, formatMod, hitDiceTotals, initiative } from '../../../rules/derive';
import { applyDamage, effectiveMaxHp, heal, isDead, rollDeathSave, setTempHp } from '../../../rules/hp';
import { CONDITION_LABEL, EXHAUSTION_EFFECTS } from '../../../rules/labels';
import { hitDiceAvailable, longRest, shortRest, spendHitDie } from '../../../rules/rests';
import { useUi } from '../../../store/ui';
import { useDice } from '../../dice/diceStore';
import { useSheet } from './SheetContext';

/** Columna derecha: combate, PG, condiciones, descansos y dinero. */
export function StatusPanel() {
  const { c, edit, update, check } = useSheet();
  return (
    <>
      <div className="vitals">
        <ArmorClassBox />
        <button type="button" className="vital rollable" onClick={() => check('Iniciativa', initiative(c))}>
          <span className="vital-label">Iniciativa</span>
          <span className="vital-value">{formatMod(initiative(c))}</span>
        </button>
        <div className="vital">
          <span className="vital-label">Velocidad</span>
          <span className="vital-value">{c.speed}</span>
          <span className="vital-unit">pies</span>
        </div>
      </div>

      <label className="inspiration">
        <input
          type="checkbox"
          checked={c.inspiration}
          onChange={(e) => update((x) => ({ ...x, inspiration: e.target.checked }))}
        />
        <span>
          <Icon name="inspiration" /> Inspiración
        </span>
      </label>

      <HpBox />
      {c.hp.current === 0 && c.hp.max > 0 && <DeathSaves />}
      <HitDice />
      <Conditions />
      <Rests />
      <Money />
      {edit && <MiscBonuses />}
    </>
  );
}

// ---------- CA ----------

const ARMOR_KIND_LABEL: Record<ArmorConfig['kind'], string> = {
  none: 'Sin armadura',
  light: 'Ligera (base + DES)',
  medium: 'Media (base + DES máx. 2)',
  heavy: 'Pesada (base)',
  natural: 'Natural (base + DES)',
};

function ArmorClassBox() {
  const { c, edit, update } = useSheet();
  const [open, setOpen] = useState(false);
  const setArmor = (patch: Partial<ArmorConfig>) => update((x) => ({ ...x, armor: { ...x.armor, ...patch } }));
  const a = c.armor;

  return (
    <>
      <button
        type="button"
        className="vital vital-ac"
        disabled={!edit}
        title={edit ? 'Configurar armadura' : undefined}
        onClick={() => setOpen(true)}
      >
        <span className="vital-label">CA</span>
        <span className="vital-value">{armorClass(c)}</span>
        {edit && <span className="vital-unit">editar</span>}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Clase de armadura"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
            Listo · CA {armorClass(c)}
          </button>
        }
      >
        <div className="field">
          <label htmlFor="ac-kind">Armadura</label>
          <select
            id="ac-kind"
            className="input"
            value={a.kind}
            onChange={(e) => {
              const kind = e.target.value as ArmorConfig['kind'];
              const base = { none: 10, light: 11, medium: 13, heavy: 16, natural: 13 }[kind];
              setArmor({ kind, base });
            }}
          >
            {Object.entries(ARMOR_KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {a.kind === 'none' ? (
          <div className="field">
            <label htmlFor="ac-ud">Defensa sin armadura</label>
            <select
              id="ac-ud"
              className="input"
              value={a.unarmoredDefense}
              onChange={(e) => setArmor({ unarmoredDefense: e.target.value as ArmorConfig['unarmoredDefense'] })}
            >
              <option value="none">No (10 + DES)</option>
              <option value="barbarian">Bárbaro (10 + DES + CON)</option>
              <option value="monk">Monje (10 + DES + SAB, sin escudo)</option>
            </select>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="ac-base">CA base de la armadura</label>
            <NumberField id="ac-base" value={a.base} min={0} max={30} onCommit={(base) => setArmor({ base })} />
          </div>
        )}
        <div className="field-row">
          <label className="checkbox">
            <input type="checkbox" checked={a.shield} onChange={(e) => setArmor({ shield: e.target.checked })} />
            Escudo (+2)
          </label>
          <label className="inline-label">
            Bonificador
            <NumberField className="input input-xs" value={a.bonus} min={-10} max={10} onCommit={(bonus) => setArmor({ bonus })} />
          </label>
        </div>
        <div className="field">
          <label htmlFor="ac-override">CA fija (deja vacío para calcularla)</label>
          <input
            id="ac-override"
            className="input"
            inputMode="numeric"
            defaultValue={c.acOverride ?? ''}
            placeholder="automática"
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              update((x) => {
                const { acOverride: _, ...rest } = x;
                return Number.isFinite(n) ? { ...rest, acOverride: n } : rest;
              });
            }}
          />
        </div>
      </Dialog>
    </>
  );
}

// ---------- PG ----------

function HpBox() {
  const { c, edit, update } = useSheet();
  const [amount, setAmount] = useState('');
  const [critical, setCritical] = useState(false);
  const toast = useUi((s) => s.toast);
  const max = effectiveMaxHp(c);
  const pct = max > 0 ? (c.hp.current / max) * 100 : 0;
  const n = parseInt(amount, 10);
  const valid = Number.isFinite(n) && n >= 0;

  function act(kind: 'damage' | 'heal' | 'temp') {
    if (!valid) return;
    update((x) => {
      if (kind === 'heal') return heal(x, n);
      if (kind === 'temp') return setTempHp(x, n);
      const { character, outcome } = applyDamage(x, n, critical);
      if (outcome === 'dead') toast(`${x.name} ha muerto.`, 'error');
      else if (outcome === 'down' && x.hp.current > 0) toast(`${x.name} cae inconsciente.`, 'error');
      return character;
    });
    setAmount('');
    setCritical(false);
  }

  return (
    <div className={`hp-box${c.hp.current === 0 && c.hp.max > 0 ? ' hp-down' : ''}`}>
      <div className="hp-head">
        <span className="vital-label">Puntos de golpe</span>
        {c.exhaustion >= 4 && <span className="muted small">máx. reducido a la mitad</span>}
      </div>
      <div className="hp-numbers">
        <span className="hp-current">{c.hp.current}</span>
        <span className="hp-sep">/</span>
        {edit ? (
          <NumberField
            className="input input-sm"
            aria-label="PG máximos"
            value={c.hp.max}
            min={0}
            max={999}
            onCommit={(v) => update((x) => ({ ...x, hp: { ...x.hp, max: v, current: Math.min(x.hp.current, v) } }))}
          />
        ) : (
          <span className="hp-max">{max}</span>
        )}
        {c.hp.temp > 0 && <span className="hp-temp" title="PG temporales">+{c.hp.temp}</span>}
      </div>
      <div className="hp-bar" aria-hidden>
        <div className="hp-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} data-low={pct <= 25} />
      </div>
      <form
        className="hp-controls"
        onSubmit={(e) => {
          e.preventDefault();
          act('damage');
        }}
      >
        <input
          className="input"
          inputMode="numeric"
          placeholder="0"
          aria-label="Cantidad"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
        />
        <button type="submit" className="btn btn-danger" disabled={!valid}>
          Daño
        </button>
        <button type="button" className="btn btn-heal" disabled={!valid || isDead(c)} onClick={() => act('heal')}>
          Curar
        </button>
        <button type="button" className="btn" disabled={!valid} onClick={() => act('temp')} title="Fija los PG temporales">
          Temp
        </button>
      </form>
      {c.hp.current === 0 && c.hp.max > 0 && (
        <label className="checkbox small">
          <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
          El daño es un golpe crítico (2 fallos)
        </label>
      )}
    </div>
  );
}

function DeathSaves() {
  const { c, update } = useSheet();
  const toast = useUi((s) => s.toast);
  const dead = isDead(c);

  function rollSave() {
    const entry = useDice.getState().check(c.name, 'Salvación de muerte', c.bonuses.saves);
    update((x) => {
      const { character, outcome } = rollDeathSave(x, entry.natural ?? entry.total, x.bonuses.saves);
      const msg = {
        revived: `¡20 natural! ${x.name} recupera 1 PG.`,
        stable: `${x.name} se estabiliza.`,
        dead: `${x.name} ha muerto.`,
        success: '', fail: '',
      }[outcome];
      if (msg) toast(msg, outcome === 'dead' ? 'error' : 'info');
      return character;
    });
  }

  const setSaves = (patch: Partial<Character['deathSaves']>) =>
    update((x) => ({ ...x, deathSaves: { ...x.deathSaves, ...patch } }));

  return (
    <div className={`death-saves card${dead ? ' is-dead' : ''}`}>
      <div className="death-row">
        <span>Éxitos</span>
        <Pips total={3} used={c.deathSaves.success} variant="success" label="Éxito" onChange={(success) => setSaves({ success })} />
      </div>
      <div className="death-row">
        <span>Fallos</span>
        <Pips total={3} used={c.deathSaves.fail} variant="fail" label="Fallo" onChange={(fail) => setSaves({ fail })} />
      </div>
      {dead ? (
        <p className="death-msg">
          <Icon name="dead" /> Muerto
        </p>
      ) : (
        <button type="button" className="btn btn-sm" onClick={rollSave}>
          <Icon name="d20" /> Tirar salvación de muerte
        </button>
      )}
    </div>
  );
}

// ---------- Dados de golpe ----------

function HitDice() {
  const { c, update } = useSheet();
  const totals = Object.entries(hitDiceTotals(c)) as [string, number][];
  if (totals.length === 0) return null;
  return (
    <div className="status-section">
      <h3 className="panel-title">Dados de golpe</h3>
      <div className="hit-dice">
        {totals.map(([die, total]) => {
          const d = Number(die) as HitDie;
          const used = c.hitDiceUsed[d] ?? 0;
          return (
            <div key={die} className="hit-die">
              <strong>d{die}</strong>
              <span>
                {total - used}/{total}
              </span>
              <span className="stepper">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Marcar un d${die} como gastado`}
                  disabled={used >= total}
                  onClick={() => update((x) => ({ ...x, hitDiceUsed: { ...x.hitDiceUsed, [d]: used + 1 } }))}
                >
                  −
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Recuperar un d${die}`}
                  disabled={used <= 0}
                  onClick={() => update((x) => ({ ...x, hitDiceUsed: { ...x.hitDiceUsed, [d]: used - 1 } }))}
                >
                  +
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Condiciones ----------

function Conditions() {
  const { c, update } = useSheet();
  const [open, setOpen] = useState(false);
  const toggle = (cond: (typeof CONDITIONS)[number]) =>
    update((x) => ({
      ...x,
      conditions: x.conditions.includes(cond) ? x.conditions.filter((k) => k !== cond) : [...x.conditions, cond],
    }));

  return (
    <div className="status-section">
      <h3 className="panel-title">
        Condiciones
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Cerrar' : '＋ Editar'}
        </button>
      </h3>
      <div className="chips">
        {(open ? CONDITIONS : c.conditions).map((cond) => (
          <button
            key={cond}
            type="button"
            className={c.conditions.includes(cond) ? 'chip chip-on' : 'chip'}
            aria-pressed={c.conditions.includes(cond)}
            onClick={() => toggle(cond)}
          >
            {CONDITION_LABEL[cond]}
          </button>
        ))}
        {!open && c.conditions.length === 0 && <span className="muted small">Ninguna</span>}
      </div>
      <div className="exhaustion">
        <span>Agotamiento</span>
        <span className="stepper">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Reducir agotamiento"
            disabled={c.exhaustion <= 0}
            onClick={() => update((x) => ({ ...x, exhaustion: x.exhaustion - 1 }))}
          >
            −
          </button>
          <strong>{c.exhaustion}</strong>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Aumentar agotamiento"
            disabled={c.exhaustion >= 6}
            onClick={() => update((x) => ({ ...x, exhaustion: x.exhaustion + 1 }))}
          >
            +
          </button>
        </span>
      </div>
      {c.exhaustion > 0 && <p className="muted small exhaustion-effect">{EXHAUSTION_EFFECTS[c.exhaustion]}</p>}
    </div>
  );
}

// ---------- Descansos ----------

function Rests() {
  const { c, update } = useSheet();
  const [shortOpen, setShortOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  const toast = useUi((s) => s.toast);

  function spend(die: HitDie) {
    const entry = useDice.getState().expr(c.name, `Dado de golpe d${die}`, `1d${die}`);
    if (!entry) return;
    update((x) => spendHitDie(x, die, entry.total).character);
  }

  const dice = (Object.keys(hitDiceTotals(c)).map(Number) as HitDie[]).sort((a, b) => b - a);

  return (
    <div className="status-section">
      <div className="rest-buttons">
        <button type="button" className="btn" onClick={() => setShortOpen(true)}>
          <Icon name="shortRest" /> Descanso corto
        </button>
        <button type="button" className="btn" onClick={() => setLongOpen(true)}>
          <Icon name="longRest" /> Descanso largo
        </button>
      </div>

      <Dialog
        open={shortOpen}
        onClose={() => setShortOpen(false)}
        title="Descanso corto"
        actions={
          <>
            <button type="button" className="btn" onClick={() => setShortOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                update(shortRest);
                setShortOpen(false);
                toast('Descanso corto completado: rasgos de descanso corto y Magia de pacto recargados.');
              }}
            >
              Terminar descanso
            </button>
          </>
        }
      >
        <p>
          PG: <strong>{c.hp.current}</strong> / {effectiveMaxHp(c)}
        </p>
        {dice.length === 0 ? (
          <p className="muted">Sin dados de golpe: agrega una clase en modo edición.</p>
        ) : (
          <div className="spend-dice">
            {dice.map((d) => (
              <button
                key={d}
                type="button"
                className="btn"
                disabled={hitDiceAvailable(c, d) <= 0 || c.hp.current >= effectiveMaxHp(c)}
                onClick={() => spend(d)}
              >
                <Icon name="d20" /> Gastar d{d} <span className="muted">({hitDiceAvailable(c, d)} disp.)</span>
              </button>
            ))}
          </div>
        )}
        <p className="muted small">Cada dado cura lo tirado + tu modificador de CON. Al terminar se recargan los rasgos de descanso corto.</p>
      </Dialog>

      <ConfirmDialog
        open={longOpen}
        title="Descanso largo"
        confirmLabel="Descansar"
        message={
          <p>
            Recuperas todos los PG, la mitad de tus dados de golpe, todos los espacios de conjuro y usos de rasgos, y
            reduces 1 nivel de agotamiento.
          </p>
        }
        onConfirm={() => {
          update(longRest);
          toast(`${c.name} completa un descanso largo.`);
        }}
        onClose={() => setLongOpen(false)}
      />
    </div>
  );
}

// ---------- Dinero ----------

const COINS = [
  ['cp', 'PC', 'Cobre'],
  ['sp', 'PP', 'Plata'],
  ['ep', 'PE', 'Electro'],
  ['gp', 'PO', 'Oro'],
  ['pp', 'PPt', 'Platino'],
] as const;

function Money() {
  const { c, update } = useSheet();
  return (
    <div className="status-section">
      <h3 className="panel-title">Monedero</h3>
      <div className="money">
        {COINS.map(([key, short, long]) => (
          <label key={key} className={`coin coin-${key}`} title={long}>
            <NumberField
              className="input coin-input"
              aria-label={long}
              value={c.currency[key]}
              min={0}
              max={9999999}
              onCommit={(v) => update((x) => ({ ...x, currency: { ...x.currency, [key]: v } }))}
            />
            <span>{short}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------- Bonificadores varios (edición) ----------

function MiscBonuses() {
  const { c, update } = useSheet();
  const set = (key: keyof Character['bonuses']) => (v: number) =>
    update((x) => ({ ...x, bonuses: { ...x.bonuses, [key]: v } }));
  return (
    <div className="status-section card">
      <h3 className="panel-title">Bonificadores varios</h3>
      <p className="muted small">De objetos o rasgos: Anillo de protección, dote Alerta, etc.</p>
      <div className="bonus-grid">
        {(
          [
            ['initiative', 'Iniciativa'],
            ['saves', 'Todas las salvaciones'],
            ['spellDc', 'CD de conjuros'],
            ['spellAttack', 'Ataque de conjuros'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="inline-label">
            <span>{label}</span>
            <NumberField className="input input-xs" value={c.bonuses[key]} min={-20} max={20} onCommit={set(key)} />
          </label>
        ))}
      </div>
    </div>
  );
}
