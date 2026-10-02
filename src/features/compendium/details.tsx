import type { ReactNode } from 'react';
import { getClass } from '../../rules/classes';
import { abilityMod, formatMod } from '../../rules/derive';
import {
  DAMAGE_TYPE_LABEL, ITEM_CATEGORY_LABEL, MONSTER_TYPE_LABEL, RARITY_LABEL, SAVE_ABILITY_LABEL, SCHOOL_LABEL, SIZE_LABEL,
  WEAPON_PROPERTY_LABEL, formatCr, label,
} from '../../srd/labels';
import type { SrdCondition, SrdItem, SrdMonster, SrdSpell } from '../../srd/types';
import { useDice } from '../dice/diceStore';
import './details.css';

/** Texto del SRD: párrafos separados por línea en blanco; respeta viñetas y tablas simples. */
export function SrdText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="srd-text">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Prop({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="srd-prop">
      <dt>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function spellSubtitle(s: SrdSpell): string {
  const school = label(SCHOOL_LABEL, s.school);
  return s.level === 0 ? `Truco de ${school.toLowerCase()}` : `${school} de nivel ${s.level}`;
}

export function SpellDetail({ spell, compact = false }: { spell: SrdSpell; compact?: boolean }) {
  return (
    <article className="srd-detail">
      {!compact && <h2 className="srd-title">{spell.name}</h2>}
      <p className="srd-subtitle">
        {spellSubtitle(spell)}
        {spell.ritual && <span className="tag">Ritual</span>}
        {spell.concentration && <span className="tag">Concentración</span>}
      </p>
      <dl className="srd-props">
        <Prop k="Tiempo de lanzamiento">{spell.castingTime}</Prop>
        <Prop k="Alcance">{spell.range}</Prop>
        <Prop k="Componentes">{spell.components}</Prop>
        <Prop k="Duración">{spell.duration}</Prop>
        {spell.save && (
          <Prop k="Salvación">
            {label(SAVE_ABILITY_LABEL, spell.save.ability)}
            {spell.save.success === 'half' ? ' (mitad si la supera)' : ''}
          </Prop>
        )}
        {spell.attackType && <Prop k="Ataque">{spell.attackType === 'ranged' ? 'De conjuro a distancia' : 'De conjuro cuerpo a cuerpo'}</Prop>}
        {spell.damageType && <Prop k="Daño">{label(DAMAGE_TYPE_LABEL, spell.damageType)}</Prop>}
      </dl>
      <SrdText text={spell.desc} />
      {spell.higherLevel && (
        <div className="srd-higher">
          <strong>A niveles superiores. </strong>
          {spell.higherLevel}
        </div>
      )}
      {!compact && (
        <p className="muted small">Clases: {spell.classes.map((c) => getClass(c)?.name ?? c).join(', ')}</p>
      )}
    </article>
  );
}

export function ItemDetail({ item }: { item: SrdItem }) {
  const w = item.weapon;
  const a = item.armor;
  return (
    <article className="srd-detail">
      <h2 className="srd-title">{item.name}</h2>
      <p className="srd-subtitle">
        {ITEM_CATEGORY_LABEL[item.category]}
        {item.sub && ` · ${item.sub}`}
        {item.rarity && ` · ${label(RARITY_LABEL, item.rarity)}`}
        {item.attunement && <span className="tag">Requiere sintonización</span>}
      </p>
      <dl className="srd-props">
        {item.cost && <Prop k="Precio">{item.cost}</Prop>}
        {item.weight !== undefined && <Prop k="Peso">{item.weight} lb</Prop>}
        {w && (
          <>
            <Prop k="Daño">
              {w.damage} {label(DAMAGE_TYPE_LABEL, w.damageType)}
              {w.versatile && ` (${w.versatile} a dos manos)`}
            </Prop>
            {w.properties.length > 0 && <Prop k="Propiedades">{w.properties.map((p) => label(WEAPON_PROPERTY_LABEL, p)).join(', ')}</Prop>}
            {w.range && <Prop k="Alcance">{w.range}</Prop>}
          </>
        )}
        {a && (
          <>
            <Prop k="CA">
              {a.kind === 'shield' ? '+2' : a.kind === 'light' ? `${a.base} + DES` : a.kind === 'medium' ? `${a.base} + DES (máx. 2)` : a.base}
            </Prop>
            {a.strMin && <Prop k="Fuerza mínima">{a.strMin}</Prop>}
            {a.stealthDisadvantage && <Prop k="Sigilo">Desventaja</Prop>}
          </>
        )}
      </dl>
      <SrdText text={item.desc} />
    </article>
  );
}

export function ConditionDetail({ condition }: { condition: SrdCondition }) {
  return (
    <article className="srd-detail">
      <h2 className="srd-title">{condition.name}</h2>
      <SrdText text={condition.desc} />
    </article>
  );
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_SHORT = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };

/** Bloque de estadísticas clásico. Los bonos de ataque y el daño se pueden tirar con un clic. */
export function MonsterStatBlock({ monster: m }: { monster: SrdMonster }) {
  const dice = useDice();
  const section = (title: string, list: { name: string; desc: string }[]) =>
    list.length > 0 && (
      <section className="stat-section">
        <h3>{title}</h3>
        {list.map((t) => (
          <p key={t.name}>
            <strong>{t.name}.</strong> {t.desc}
          </p>
        ))}
      </section>
    );

  return (
    <article className="srd-detail stat-block">
      <h2 className="srd-title">{m.name}</h2>
      <p className="srd-subtitle">
        {label(SIZE_LABEL, m.size)} {label(MONSTER_TYPE_LABEL, m.type).toLowerCase()}
        {m.subtype && ` (${m.subtype})`}, {m.alignment}
      </p>
      <dl className="srd-props stat-top">
        <Prop k="CA">
          {m.ac}
          {m.acNote && <span className="muted"> ({m.acNote})</span>}
        </Prop>
        <Prop k="PG">
          <button type="button" className="roll-btn" title="Tirar PG" onClick={() => dice.expr(m.name, 'Puntos de golpe', m.hpRoll)}>
            {m.hp}
          </button>{' '}
          <span className="muted">({m.hpRoll})</span>
        </Prop>
        <Prop k="Velocidad">{m.speed}</Prop>
      </dl>
      <div className="stat-abilities">
        {ABILITY_KEYS.map((k) => {
          const mod = abilityMod(m.abilities[k]);
          return (
            <button key={k} type="button" className="rollable" onClick={() => dice.check(m.name, `Prueba de ${ABILITY_SHORT[k]}`, mod)}>
              <span className="vital-label">{ABILITY_SHORT[k]}</span>
              <strong>{m.abilities[k]}</strong>
              <span className="muted small">({formatMod(mod)})</span>
            </button>
          );
        })}
      </div>
      <dl className="srd-props">
        {m.saves && <Prop k="Salvaciones">{m.saves}</Prop>}
        {m.skills && <Prop k="Habilidades">{m.skills}</Prop>}
        {m.vulnerabilities && <Prop k="Vulnerable a">{m.vulnerabilities}</Prop>}
        {m.resistances && <Prop k="Resistente a">{m.resistances}</Prop>}
        {m.immunities && <Prop k="Inmune a">{m.immunities}</Prop>}
        {m.conditionImmunities && <Prop k="Inmune a condiciones">{m.conditionImmunities}</Prop>}
        <Prop k="Sentidos">{m.senses}</Prop>
        <Prop k="Idiomas">{m.languages}</Prop>
        <Prop k="Desafío">
          {formatCr(m.cr)} <span className="muted">({m.xp.toLocaleString('es')} PX)</span>
        </Prop>
      </dl>
      {section('Rasgos', m.traits)}
      {m.actions.length > 0 && (
        <section className="stat-section">
          <h3>Acciones</h3>
          {m.actions.map((a) => (
            <div key={a.name} className="stat-action">
              <p>
                <strong>{a.name}.</strong> {a.desc}
              </p>
              {(a.attackBonus !== undefined || (a.damage && a.damage.length > 0)) && (
                <div className="stat-rolls">
                  {a.attackBonus !== undefined && (
                    <button type="button" className="roll-btn" onClick={() => dice.check(m.name, `${a.name}: ataque`, a.attackBonus!)}>
                      🎲 {formatMod(a.attackBonus)}
                    </button>
                  )}
                  {a.damage?.map((d) => {
                    const [expr, type] = d.split(' ');
                    return (
                      <button key={d} type="button" className="roll-btn" onClick={() => dice.expr(m.name, `${a.name}: daño ${label(DAMAGE_TYPE_LABEL, type)}`, expr)}>
                        {expr} {label(DAMAGE_TYPE_LABEL, type)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
      {section('Reacciones', m.reactions)}
      {section('Acciones legendarias', m.legendary)}
      <SrdText text={m.desc} />
    </article>
  );
}
