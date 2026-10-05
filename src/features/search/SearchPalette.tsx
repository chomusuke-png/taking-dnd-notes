import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { db } from '../../db/db';
import type { Id } from '../../db/types';
import { buildIndex, excerpt, toSearchDocs, type SearchDoc } from './searchIndex';
import './search.css';

interface Props {
  campaignId: Id;
  open: boolean;
  onClose: () => void;
}

const MAX_RESULTS = 12;

/** Paleta de búsqueda global (Ctrl+K) sobre notas y personajes de la campaña. */
export function SearchPalette({ campaignId, open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  // El índice se construye al abrir: así siempre refleja lo último y no cuesta nada mientras está cerrado.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!open) {
      if (el.open) el.close();
      return;
    }
    el.showModal();
    setQuery('');
    setSelected(0);
    let cancelled = false;
    void Promise.all([
      db.notes.where('campaignId').equals(campaignId).toArray(),
      db.characters.where('campaignId').equals(campaignId).toArray(),
    ]).then(([notes, characters]) => !cancelled && setDocs(toSearchDocs(notes, characters)));
    return () => {
      cancelled = true;
    };
  }, [open, campaignId]);

  const index = useMemo(() => (docs ? buildIndex(docs) : null), [docs]);
  const byId = useMemo(() => new Map(docs?.map((d) => [d.id, d])), [docs]);

  const results = useMemo(() => {
    if (!docs || !index) return [];
    if (!query.trim()) return [...docs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
    return index
      .search(query)
      .slice(0, MAX_RESULTS)
      .map((r) => byId.get(r.id as string)!)
      .filter(Boolean);
  }, [docs, index, byId, query]);

  useEffect(() => setSelected(0), [query]);

  function go(doc: SearchDoc | undefined) {
    if (!doc) return;
    onClose();
    navigate(`/c/${campaignId}/${doc.path}`);
  }

  return (
    <dialog ref={ref} className="search-palette" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label="Buscar en la campaña">
      {open && (
        <>
          <div className="search-input-row">
            <Icon name="search" />
            <input
              autoFocus
              className="search-input"
              placeholder="Buscar notas, PNJ, lugares, personajes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelected((s) => Math.min(results.length - 1, s + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelected((s) => Math.max(0, s - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  go(results[selected]);
                }
              }}
              role="combobox"
              aria-expanded
              aria-controls="search-results"
              aria-activedescendant={results[selected] ? `sr-${results[selected].id}` : undefined}
            />
            <kbd>Esc</kbd>
          </div>
          <ul id="search-results" className="search-results" role="listbox">
            {!query.trim() && results.length > 0 && <li className="search-section muted small">Editado recientemente</li>}
            {results.map((d, i) => (
              <li
                key={d.id}
                id={`sr-${d.id}`}
                role="option"
                aria-selected={i === selected}
                className={`search-result${i === selected ? ' is-selected' : ''}`}
                onMouseEnter={() => setSelected(i)}
                onClick={() => go(d)}
              >
                <span className="search-result-icon" aria-hidden>
                  <Icon name={d.icon} />
                </span>
                <span className="search-result-body">
                  <span className="search-result-title">{d.title}</span>
                  {query.trim() && d.body && <span className="muted small search-result-excerpt">{excerpt(d.body, query)}</span>}
                </span>
                <span className="muted small">{d.hint}</span>
              </li>
            ))}
            {docs && query.trim() && results.length === 0 && <li className="search-section muted">Sin resultados para «{query}».</li>}
            {docs && !query.trim() && results.length === 0 && <li className="search-section muted">La campaña aún no tiene notas ni personajes.</li>}
          </ul>
          <div className="search-footer muted small">↑↓ para moverte · Enter para abrir</div>
        </>
      )}
    </dialog>
  );
}
