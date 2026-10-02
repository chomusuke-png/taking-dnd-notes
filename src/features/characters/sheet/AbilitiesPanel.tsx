import { ListField, NumberField } from '../../../components/fields';
import { ABILITIES, SKILLS, type Ability, type ProficiencyLevel, type Skill } from '../../../db/types';
import { ABILITY_LABEL, SKILL_LABEL } from '../../../rules/labels';
import {
  SKILL_ABILITY, abilityMod, formatMod, passiveScore, profOf, saveBonus, skillBonus, skillProficiency,
} from '../../../rules/derive';
import { useSheet } from './SheetContext';

const PROF_ICON: Record<number, string> = { 0: '○', 0.5: '◐', 1: '●', 2: '◉' };
const PROF_TITLE: Record<number, string> = { 0: 'Sin competencia', 0.5: 'Jack of all trades (½)', 1: 'Competente', 2: 'Pericia' };
const NEXT_PROF: Record<ProficiencyLevel, ProficiencyLevel> = { 0: 1, 1: 2, 2: 0 };

/** Columna izquierda: características, salvaciones, habilidades, pasivas y competencias. */
export function AbilitiesPanel() {
  const { c, edit, update, check } = useSheet();

  const toggleSave = (a: Ability) =>
    update((x) => {
      const saves = x.proficiencies.saves.includes(a)
        ? x.proficiencies.saves.filter((s) => s !== a)
        : [...x.proficiencies.saves, a];
      return { ...x, proficiencies: { ...x.proficiencies, saves } };
    });

  const cycleSkill = (s: Skill) =>
    update((x) => {
      const skills = { ...x.proficiencies.skills };
      const next = NEXT_PROF[skills[s] ?? 0];
      if (next === 0) delete skills[s];
      else skills[s] = next;
      return { ...x, proficiencies: { ...x.proficiencies, skills } };
    });

  const setList = (key: 'armor' | 'weapons' | 'tools' | 'languages') => (value: string[]) =>
    update((x) => ({ ...x, proficiencies: { ...x.proficiencies, [key]: value } }));

  return (
    <>
      <div className="ability-grid">
        {ABILITIES.map((a) => {
          const m = abilityMod(c.abilities[a]);
          return edit ? (
            <div key={a} className="ability-box">
              <span className="ability-name">{ABILITY_LABEL[a].short}</span>
              <span className="ability-mod">{formatMod(m)}</span>
              <NumberField
                className="input ability-input"
                aria-label={ABILITY_LABEL[a].long}
                value={c.abilities[a]}
                min={1}
                max={30}
                onCommit={(v) => update((x) => ({ ...x, abilities: { ...x.abilities, [a]: v } }))}
              />
            </div>
          ) : (
            <button
              key={a}
              type="button"
              className="ability-box rollable"
              title={`Prueba de ${ABILITY_LABEL[a].long}`}
              onClick={() => check(`Prueba de ${ABILITY_LABEL[a].long}`, m)}
            >
              <span className="ability-name">{ABILITY_LABEL[a].short}</span>
              <span className="ability-mod">{formatMod(m)}</span>
              <span className="ability-score">{c.abilities[a]}</span>
            </button>
          );
        })}
      </div>

      <div className="prof-row">
        <span>Bonificador de competencia</span>
        <strong>{formatMod(profOf(c))}</strong>
      </div>

      <h3 className="panel-title">Salvaciones</h3>
      <ul className="check-list">
        {ABILITIES.map((a) => {
          const proficient = c.proficiencies.saves.includes(a);
          const bonus = saveBonus(c, a);
          return (
            <li key={a}>
              <button
                type="button"
                className="prof-dot"
                disabled={!edit}
                title={proficient ? 'Competente' : 'Sin competencia'}
                aria-label={`Competencia en salvación de ${ABILITY_LABEL[a].long}`}
                aria-pressed={proficient}
                onClick={() => toggleSave(a)}
              >
                {proficient ? '●' : '○'}
              </button>
              <button
                type="button"
                className="check-row rollable"
                onClick={() => check(`Salvación de ${ABILITY_LABEL[a].long}`, bonus)}
              >
                <span>{ABILITY_LABEL[a].long}</span>
                <span className="check-bonus">{formatMod(bonus)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="panel-title">
        Habilidades
        {edit && (
          <label className="checkbox small" title="Mitad de la competencia (redondeada hacia abajo) en pruebas sin competencia">
            <input
              type="checkbox"
              checked={c.proficiencies.jackOfAllTrades}
              onChange={(e) =>
                update((x) => ({ ...x, proficiencies: { ...x.proficiencies, jackOfAllTrades: e.target.checked } }))
              }
            />
            Jack of all trades
          </label>
        )}
      </h3>
      <ul className="check-list">
        {SKILLS.map((s) => {
          const level = skillProficiency(c, s);
          const bonus = skillBonus(c, s);
          return (
            <li key={s}>
              <button
                type="button"
                className={`prof-dot${level === 2 ? ' prof-expert' : ''}`}
                disabled={!edit}
                title={PROF_TITLE[level]}
                aria-label={`Competencia en ${SKILL_LABEL[s]}: ${PROF_TITLE[level]}`}
                onClick={() => cycleSkill(s)}
              >
                {PROF_ICON[level]}
              </button>
              <button type="button" className="check-row rollable" onClick={() => check(SKILL_LABEL[s], bonus)}>
                <span>
                  {SKILL_LABEL[s]} <span className="muted small">{ABILITY_LABEL[SKILL_ABILITY[s]].short}</span>
                </span>
                <span className="check-bonus">{formatMod(bonus)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {edit && <p className="muted small hint">Clic en el círculo: sin competencia → competente → pericia.</p>}

      <h3 className="panel-title">Pasivas</h3>
      <div className="passives">
        {(['perception', 'investigation', 'insight'] as const).map((s) => (
          <div key={s} className="passive">
            <strong>{passiveScore(c, s)}</strong>
            <span className="muted small">{SKILL_LABEL[s]}</span>
          </div>
        ))}
      </div>

      <h3 className="panel-title">Competencias e idiomas</h3>
      <dl className="prof-lists">
        {(
          [
            ['armor', 'Armaduras', 'Ligeras, medias, escudos'],
            ['weapons', 'Armas', 'Sencillas, marciales'],
            ['tools', 'Herramientas', 'Herramientas de ladrón'],
            ['languages', 'Idiomas', 'Común, Enano'],
          ] as const
        ).map(([key, label, placeholder]) => (
          <div key={key}>
            <dt className="muted small">{label}</dt>
            <dd>
              {edit ? (
                <ListField value={c.proficiencies[key]} onCommit={setList(key)} placeholder={placeholder} />
              ) : c.proficiencies[key].length ? (
                c.proficiencies[key].join(', ')
              ) : (
                <span className="muted">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
