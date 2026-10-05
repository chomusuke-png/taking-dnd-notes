import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/Dialog';
import { QuickHp } from '../../components/QuickHp';
import { updateCharacter } from '../../db/characters';
import { db } from '../../db/db';
import type { Character } from '../../db/types';
import { className } from '../../rules/classes';
import { armorClass, formatMod, initiative, passiveScore, spellcastingStats, totalLevel } from '../../rules/derive';
import { effectiveMaxHp } from '../../rules/hp';
import { CONDITION_LABEL, EXHAUSTION_EFFECTS } from '../../rules/labels';
import { longRest, shortRest } from '../../rules/rests';
import { useUi } from '../../store/ui';
import { damageCharacter, healCharacter, toggleCharacterCondition } from '../characters/hpActions';
import type { WorkspaceContext } from '../workspace/CampaignLayout';
import './party.css';

/** Pantalla del DM: el estado de todo el grupo de un vistazo. */
export function PartyPage() {
  const { campaign } = useOutletContext<WorkspaceContext>();
  const party = useLiveQuery(
    async () => (await db.characters.where('campaignId').equals(campaign.id).sortBy('name')).filter((c) => c.kind === 'pc'),
    [campaign.id],
  );
  const [rest, setRest] = useState<'short' | 'long' | null>(null);
  const toast = useUi((s) => s.toast);

  if (party === undefined) return null;
  if (party.length === 0) {
    return (
      <div className="placeholder">
        <p className="placeholder-icon" aria-hidden>
          <Icon name="party" />
        </p>
        <h2>El grupo está vacío</h2>
        <p className="muted">Crea los personajes jugadores para ver aquí sus PG, CA, pasivas y condiciones.</p>
        <Link className="btn btn-primary" to={`/c/${campaign.id}/personajes`}>
          Ir a personajes
        </Link>
      </div>
    );
  }

  const avgLevel = party.reduce((s, c) => s + totalLevel(c), 0) / party.length;

  return (
    <div className="party">
      <div className="page-toolbar">
        <div>
          <h2 className="party-title">Grupo</h2>
          <p className="muted small">
            {party.length} personajes · nivel promedio {avgLevel.toFixed(1).replace('.0', '')}
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="btn" onClick={() => setRest('short')}>
            <Icon name="shortRest" /> Descanso corto del grupo
          </button>
          <button className="btn" onClick={() => setRest('long')}>
            <Icon name="longRest" /> Descanso largo del grupo
          </button>
        </div>
      </div>

      <ul className="party-grid">
        {party.map((c) => (
          <PartyCard key={c.id} c={c} campaignId={campaign.id} />
        ))}
      </ul>

      <table className="sheet-table party-table">
        <caption className="muted small">Pasivas y defensas para tiradas secretas</caption>
        <thead>
          <tr>
            <th>Personaje</th>
            <th className="num">Percepción</th>
            <th className="num">Investigación</th>
            <th className="num">Perspicacia</th>
            <th className="num">CA</th>
            <th className="num">CD conjuros</th>
          </tr>
        </thead>
        <tbody>
          {party.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="num">{passiveScore(c, 'perception')}</td>
              <td className="num">{passiveScore(c, 'investigation')}</td>
              <td className="num">{passiveScore(c, 'insight')}</td>
              <td className="num">{armorClass(c)}</td>
              <td className="num">{spellcastingStats(c).map((s) => s.saveDc).join(' / ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={rest !== null}
        title={rest === 'long' ? 'Descanso largo del grupo' : 'Descanso corto del grupo'}
        confirmLabel="Descansar"
        message={
          rest === 'long' ? (
            <p>Todos recuperan PG, la mitad de sus dados de golpe, espacios de conjuro y usos de rasgos, y reducen 1 nivel de agotamiento.</p>
          ) : (
            <p>Se recargan los rasgos de descanso corto y la Magia de pacto. Los dados de golpe se gastan desde la hoja de cada personaje.</p>
          )
        }
        onConfirm={() => {
          const fn = rest === 'long' ? longRest : shortRest;
          void Promise.all(party.map((c) => updateCharacter(c.id, fn))).then(() =>
            toast(rest === 'long' ? 'El grupo completó un descanso largo.' : 'El grupo completó un descanso corto.'),
          );
        }}
        onClose={() => setRest(null)}
      />
    </div>
  );
}

function PartyCard({ c, campaignId }: { c: Character; campaignId: string }) {
  const max = effectiveMaxHp(c);
  const pct = max > 0 ? Math.min(100, (c.hp.current / max) * 100) : 0;
  const down = c.hp.current === 0 && c.hp.max > 0;

  return (
    <li className={`party-card${down ? ' is-down' : ''}`}>
      <div className="party-card-head">
        <div>
          <Link to={`/c/${campaignId}/personajes/${c.id}`} className="party-name">
            {c.name}
          </Link>
          <p className="muted small">
            {c.classes.map((cls) => `${className(cls)} ${cls.level}`).join(' / ') || 'Sin clase'}
            {c.player && ` · ${c.player}`}
          </p>
        </div>
        <button
          type="button"
          className={`inspiration-toggle${c.inspiration ? ' is-on' : ''}`}
          title={c.inspiration ? 'Tiene inspiración' : 'Sin inspiración'}
          aria-pressed={c.inspiration}
          onClick={() => void updateCharacter(c.id, (x) => ({ ...x, inspiration: !x.inspiration }))}
        >
          <Icon name="inspiration" />
        </button>
      </div>

      <div className="party-vitals">
        <span title="Clase de armadura"><Icon name="armorClass" /> <strong>{armorClass(c)}</strong></span>
        <span title="Iniciativa"><Icon name="initiative" /> {formatMod(initiative(c))}</span>
        <span title="Percepción pasiva"><Icon name="perception" /> {passiveScore(c, 'perception')}</span>
        <span title="Velocidad"><Icon name="speed" /> {c.speed}</span>
      </div>

      <div className="party-hp">
        <span>
          <strong className="party-hp-current">{c.hp.current}</strong>/{max}
          {c.hp.temp > 0 && <span className="hp-temp-sm"> +{c.hp.temp}</span>}
        </span>
        <QuickHp label={c.name} onDamage={(n) => void damageCharacter(c.id, n)} onHeal={(n) => void healCharacter(c.id, n)} />
      </div>
      <div className="hp-bar" aria-hidden>
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} data-low={pct <= 25} />
      </div>

      {down && (
        <p className="small death-line">
          {c.deathSaves.fail >= 3 ? <><Icon name="dead" /> Muerto</> : `Salvaciones de muerte: ${c.deathSaves.success} ✓ · ${c.deathSaves.fail} ✗`}
        </p>
      )}

      <div className="chips party-conds">
        {c.conditions.map((cond) => (
          <button key={cond} type="button" className="chip chip-on chip-xs" title="Quitar" onClick={() => void toggleCharacterCondition(c.id, cond)}>
            {CONDITION_LABEL[cond]} ✕
          </button>
        ))}
        {c.exhaustion > 0 && (
          <span className="chip chip-on chip-xs" title={EXHAUSTION_EFFECTS[c.exhaustion]}>
            Agotamiento {c.exhaustion}
          </span>
        )}
      </div>
    </li>
  );
}
