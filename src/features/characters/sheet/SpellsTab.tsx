import { Pips } from '../../../components/fields';
import { getClass } from '../../../rules/classes';
import { formatMod, spellcastingStats } from '../../../rules/derive';
import { ABILITY_LABEL } from '../../../rules/labels';
import { pactSlots, spellSlots } from '../../../rules/spellSlots';
import { useSheet } from './SheetContext';

const ORDINAL = ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º', '7.º', '8.º', '9.º'];

export function SpellsTab() {
  const { c, update, check } = useSheet();
  const stats = spellcastingStats(c);
  const slots = spellSlots(c.classes);
  const pact = pactSlots(c.classes);

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
        {slots.every((s) => s === 0) && pact.count === 0 && (
          <li className="muted small">Aún sin espacios de conjuro a este nivel.</li>
        )}
      </ul>

      <div className="coming-soon">
        <strong>Lista de conjuros</strong>
        <p className="muted small">
          Los conjuros conocidos y preparados se agregan desde el compendio SRD (fase F3). Mientras tanto puedes anotarlos
          como rasgos.
        </p>
      </div>
    </div>
  );
}
