import { useMemo, useState } from 'react';
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom';
import { CLASSES } from '../../rules/classes';
import { useSrd, type SrdItem, type SrdKind, type SrdMonster, type SrdSpell } from '../../srd';
import { ITEM_CATEGORY_LABEL, MONSTER_TYPE_LABEL, RARITY_LABEL, SCHOOL_LABEL, SPELL_LEVEL_LABEL, formatCr, label } from '../../srd/labels';
import { fold } from '../../lib/text';
import type { WorkspaceContext } from '../workspace/CampaignLayout';
import { AddToCharacterDialog } from './AddToCharacterDialog';
import { ConditionDetail, ItemDetail, MonsterStatBlock, SpellDetail } from './details';
import './compendium.css';

const KINDS: { kind: SrdKind; label: string; icon: string }[] = [
  { kind: 'spells', label: 'Conjuros', icon: '✨' },
  { kind: 'monsters', label: 'Monstruos', icon: '🐉' },
  { kind: 'items', label: 'Objetos', icon: '🎒' },
  { kind: 'conditions', label: 'Condiciones', icon: '🌀' },
];

const CR_STEPS = [0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 13, 17, 21, 30];
const PAGE = 150;

interface Row {
  id: string;
  name: string;
  meta: string;
}

export function CompendiumPage() {
  const { kind = 'spells', id } = useParams();
  if (!KINDS.some((k) => k.kind === kind)) return <Navigate to=".." relative="path" replace />;
  return <Compendium kind={kind as SrdKind} id={id} />;
}

function Compendium({ kind, id }: { kind: SrdKind; id?: string }) {
  const { campaign } = useOutletContext<WorkspaceContext>();
  // Solo se descarga la colección de la pestaña visible.
  const spells = useSrd('spells', kind === 'spells');
  const monsters = useSrd('monsters', kind === 'monsters');
  const items = useSrd('items', kind === 'items');
  const conditions = useSrd('conditions', kind === 'conditions');

  const [query, setQuery] = useState('');
  const [spellLevel, setSpellLevel] = useState('');
  const [spellClass, setSpellClass] = useState('');
  const [school, setSchool] = useState('');
  const [monsterType, setMonsterType] = useState('');
  const [crMax, setCrMax] = useState('');
  const [itemCat, setItemCat] = useState('');
  const [rarity, setRarity] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [adding, setAdding] = useState<{ kind: 'spell'; spell: SrdSpell } | { kind: 'item'; item: SrdItem } | null>(null);

  const rows: Row[] | undefined = useMemo(() => {
    const q = fold(query.trim());
    const match = (name: string) => !q || fold(name).includes(q);
    switch (kind) {
      case 'spells':
        return spells
          ?.filter(
            (s) =>
              match(s.name) &&
              (spellLevel === '' || s.level === Number(spellLevel)) &&
              (!spellClass || s.classes.includes(spellClass)) &&
              (!school || s.school === school),
          )
          .map((s) => ({
            id: s.id,
            name: s.name,
            meta: `${SPELL_LEVEL_LABEL(s.level)} · ${label(SCHOOL_LABEL, s.school)}${s.concentration ? ' · C' : ''}${s.ritual ? ' · R' : ''}`,
          }));
      case 'monsters':
        return monsters
          ?.filter((m) => match(m.name) && (!monsterType || m.type === monsterType) && (crMax === '' || m.cr <= Number(crMax)))
          .map((m) => ({ id: m.id, name: m.name, meta: `VD ${formatCr(m.cr)} · ${label(MONSTER_TYPE_LABEL, m.type)}` }));
      case 'items':
        return items
          ?.filter((i) => match(i.name) && (!itemCat || i.category === itemCat) && (!rarity || i.rarity === rarity))
          .map((i) => ({ id: i.id, name: i.name, meta: [ITEM_CATEGORY_LABEL[i.category], i.rarity && label(RARITY_LABEL, i.rarity), i.cost].filter(Boolean).join(' · ') }));
      case 'conditions':
        return conditions?.filter((c) => match(c.name)).map((c) => ({ id: c.id, name: c.name, meta: '' }));
    }
  }, [kind, spells, monsters, items, conditions, query, spellLevel, spellClass, school, monsterType, crMax, itemCat, rarity]);

  const monsterTypes = useMemo(() => [...new Set(monsters?.map((m) => m.type))].sort(), [monsters]);
  const base = `/c/${campaign.id}/compendio/${kind}`;

  const detail = (() => {
    if (!id) return null;
    if (kind === 'spells') {
      const s = spells?.find((x) => x.id === id);
      return s && (
        <>
          <DetailActions onAdd={() => setAdding({ kind: 'spell', spell: s })} label="Agregar a un personaje" />
          <SpellDetail spell={s} />
        </>
      );
    }
    if (kind === 'monsters') {
      const m = monsters?.find((x) => x.id === id);
      return m && <MonsterStatBlock monster={m as SrdMonster} />;
    }
    if (kind === 'items') {
      const it = items?.find((x) => x.id === id);
      return it && (
        <>
          <DetailActions onAdd={() => setAdding({ kind: 'item', item: it })} label="Agregar al inventario" />
          <ItemDetail item={it} />
        </>
      );
    }
    const c = conditions?.find((x) => x.id === id);
    return c && <ConditionDetail condition={c} />;
  })();

  return (
    <div className={`compendium${id ? ' has-detail' : ''}`}>
      <aside className="compendium-list-pane">
        <div className="seg compendium-kinds" role="tablist">
          {KINDS.map((k) => (
            <Link
              key={k.kind}
              to={`/c/${campaign.id}/compendio/${k.kind}`}
              role="tab"
              aria-selected={kind === k.kind}
              className={kind === k.kind ? 'seg-item seg-on' : 'seg-item'}
              onClick={() => setLimit(PAGE)}
            >
              <span aria-hidden>{k.icon}</span> {k.label}
            </Link>
          ))}
        </div>

        <input
          className="input input-sm"
          placeholder="Buscar por nombre (en inglés: Fireball, Goblin…)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Buscar"
        />

        <div className="compendium-filters">
          {kind === 'spells' && (
            <>
              <select className="input input-sm" value={spellLevel} onChange={(e) => setSpellLevel(e.target.value)} aria-label="Nivel">
                <option value="">Todos los niveles</option>
                {Array.from({ length: 10 }, (_, l) => (
                  <option key={l} value={l}>
                    {SPELL_LEVEL_LABEL(l)}
                  </option>
                ))}
              </select>
              <select className="input input-sm" value={spellClass} onChange={(e) => setSpellClass(e.target.value)} aria-label="Clase">
                <option value="">Todas las clases</option>
                {CLASSES.filter((c) => c.caster !== 'none').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select className="input input-sm" value={school} onChange={(e) => setSchool(e.target.value)} aria-label="Escuela">
                <option value="">Todas las escuelas</option>
                {Object.entries(SCHOOL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </>
          )}
          {kind === 'monsters' && (
            <>
              <select className="input input-sm" value={monsterType} onChange={(e) => setMonsterType(e.target.value)} aria-label="Tipo">
                <option value="">Todos los tipos</option>
                {monsterTypes.map((t) => (
                  <option key={t} value={t}>
                    {label(MONSTER_TYPE_LABEL, t)}
                  </option>
                ))}
              </select>
              <select className="input input-sm" value={crMax} onChange={(e) => setCrMax(e.target.value)} aria-label="Desafío máximo">
                <option value="">Cualquier VD</option>
                {CR_STEPS.map((cr) => (
                  <option key={cr} value={cr}>
                    VD ≤ {formatCr(cr)}
                  </option>
                ))}
              </select>
            </>
          )}
          {kind === 'items' && (
            <>
              <select className="input input-sm" value={itemCat} onChange={(e) => setItemCat(e.target.value)} aria-label="Categoría">
                <option value="">Todas las categorías</option>
                {Object.entries(ITEM_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {(itemCat === 'magic' || itemCat === '') && (
                <select className="input input-sm" value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Rareza">
                  <option value="">Cualquier rareza</option>
                  {Object.entries(RARITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        <p className="muted small compendium-count">{rows ? `${rows.length} resultados` : 'Cargando…'}</p>
        <ul className="compendium-list">
          {rows?.slice(0, limit).map((r) => (
            <li key={r.id}>
              <Link to={`${base}/${r.id}`} className={`compendium-item${r.id === id ? ' is-active' : ''}`}>
                <span className="compendium-item-name">{r.name}</span>
                {r.meta && <span className="muted small">{r.meta}</span>}
              </Link>
            </li>
          ))}
          {rows && rows.length > limit && (
            <li>
              <button type="button" className="btn btn-ghost btn-sm compendium-more" onClick={() => setLimit((l) => l + PAGE)}>
                Mostrar {Math.min(PAGE, rows.length - limit)} más
              </button>
            </li>
          )}
        </ul>
      </aside>

      <section className="compendium-detail">
        {id ? (
          <>
            <Link to={base} className="muted compendium-back">
              ← {KINDS.find((k) => k.kind === kind)?.label}
            </Link>
            {detail ?? (rows ? <p className="muted">Entrada no encontrada.</p> : null)}
          </>
        ) : (
          <div className="placeholder">
            <p className="placeholder-icon" aria-hidden>
              📚
            </p>
            <h2>Compendio SRD 5.1</h2>
            <p className="muted">
              Conjuros, monstruos, objetos y condiciones de las reglas básicas de D&D 5e (2014). Elige una entrada para ver
              el detalle y agregarla a un personaje.
            </p>
          </div>
        )}
        <p className="srd-attribution muted small">
          Incluye material del System Reference Document 5.1 («SRD 5.1») de Wizards of the Coast LLC, disponible en
          https://dnd.wizards.com/resources/systems-reference-document, con licencia{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">
            CC-BY-4.0
          </a>
          . Datos: 5e-bits/5e-database (MIT).
        </p>
      </section>

      <AddToCharacterDialog campaignId={campaign.id} target={adding} onClose={() => setAdding(null)} />
    </div>
  );
}

function DetailActions({ onAdd, label: text }: { onAdd: () => void; label: string }) {
  return (
    <div className="detail-actions">
      <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
        ＋ {text}
      </button>
    </div>
  );
}
