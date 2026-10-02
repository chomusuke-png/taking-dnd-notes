import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { NOTE_TYPE_INFO, QUEST_STATUS_LABEL, WIKI_TYPES, createNote } from '../../db/notes';
import type { Note, NoteType } from '../../db/types';
import type { WorkspaceContext } from '../workspace/CampaignLayout';
import { fold } from '../../lib/text';
import { NoteView } from './NoteView';
import './notes.css';

type Mode = 'journal' | 'wiki';

const dateFmt = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: 'UTC' });
export const formatSessionDate = (iso?: string) => (iso ? dateFmt.format(new Date(iso)) : '');

export const JournalPage = () => <NotesPage mode="journal" />;
export const WikiPage = () => <NotesPage mode="wiki" />;

/** Diario (sesiones) y Wiki (resto de tipos) comparten esta pantalla de lista + nota. */
export function NotesPage({ mode }: { mode: Mode }) {
  const { campaign } = useOutletContext<WorkspaceContext>();
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all');
  const [text, setText] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [creatingMenu, setCreatingMenu] = useState(false);

  const notes = useLiveQuery(() => db.notes.where('campaignId').equals(campaign.id).toArray(), [campaign.id]);

  const scoped = useMemo(
    () => (notes ?? []).filter((n) => (mode === 'journal' ? n.type === 'session' : n.type !== 'session')),
    [notes, mode],
  );
  const allTags = useMemo(() => [...new Set(scoped.flatMap((n) => n.tags))].sort((a, b) => a.localeCompare(b, 'es')), [scoped]);

  const visible = useMemo(() => {
    const q = fold(text.trim());
    const list = scoped.filter(
      (n) =>
        (typeFilter === 'all' || n.type === typeFilter) &&
        (!tag || n.tags.includes(tag)) &&
        (!q || [n.title, ...n.aliases].some((s) => fold(s).includes(q))),
    );
    return mode === 'journal'
      ? list.sort((a, b) => (b.session?.number ?? 0) - (a.session?.number ?? 0))
      : list.sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }, [scoped, typeFilter, tag, text, mode]);

  async function create(type: NoteType) {
    setCreatingMenu(false);
    const n = await createNote(campaign.id, { type });
    navigate(n.id);
  }

  const base = mode === 'journal' ? 'diario' : 'wiki';

  return (
    <div className={`notes-page${noteId ? ' has-note' : ''}`}>
      <aside className="notes-list-pane">
        <div className="notes-list-head">
          <h2>{mode === 'journal' ? 'Diario' : 'Wiki'}</h2>
          {mode === 'journal' ? (
            <button className="btn btn-primary btn-sm" onClick={() => create('session')}>
              ＋ Sesión
            </button>
          ) : (
            <div className="menu-anchor">
              <button className="btn btn-primary btn-sm" aria-expanded={creatingMenu} onClick={() => setCreatingMenu((o) => !o)}>
                ＋ Nueva
              </button>
              {creatingMenu && (
                <div className="menu" role="menu">
                  {WIKI_TYPES.map((t) => (
                    <button key={t} role="menuitem" className="menu-item" onClick={() => create(t)}>
                      {NOTE_TYPE_INFO[t].icon} {NOTE_TYPE_INFO[t].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <input
          className="input input-sm"
          placeholder={mode === 'journal' ? 'Filtrar sesiones…' : 'Filtrar por nombre o alias…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Filtrar"
        />

        {mode === 'wiki' && (
          <div className="chips type-chips">
            <button className={typeFilter === 'all' ? 'chip chip-on' : 'chip'} onClick={() => setTypeFilter('all')}>
              Todo
            </button>
            {WIKI_TYPES.map((t) => (
              <button key={t} className={typeFilter === t ? 'chip chip-on' : 'chip'} onClick={() => setTypeFilter(t)}>
                {NOTE_TYPE_INFO[t].icon} {NOTE_TYPE_INFO[t].plural}
              </button>
            ))}
          </div>
        )}
        {allTags.length > 0 && (
          <div className="chips tag-chips">
            {allTags.map((t) => (
              <button key={t} className={tag === t ? 'chip chip-on' : 'chip'} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </button>
            ))}
          </div>
        )}

        <ul className="notes-list">
          {visible.map((n) => (
            <li key={n.id}>
              <Link to={`/c/${campaign.id}/${base}/${n.id}`} className={`notes-item${n.id === noteId ? ' is-active' : ''}`}>
                <NoteListItem n={n} />
              </Link>
            </li>
          ))}
          {notes !== undefined && visible.length === 0 && (
            <li className="muted small notes-empty">
              {scoped.length === 0
                ? mode === 'journal'
                  ? 'Aún no hay sesiones. Crea la primera con ＋ Sesión.'
                  : 'La wiki está vacía. Crea PNJ, lugares o misiones, o escribe [[Nombre]] en una nota.'
                : 'Nada coincide con el filtro.'}
            </li>
          )}
        </ul>
      </aside>

      <section className="notes-main">
        {noteId ? (
          <NoteView key={noteId} noteId={noteId} campaignId={campaign.id} backTo={`/c/${campaign.id}/${base}`} />
        ) : (
          <div className="placeholder">
            <p className="placeholder-icon" aria-hidden>
              {mode === 'journal' ? '📖' : '🗺️'}
            </p>
            <h2>{mode === 'journal' ? 'Diario de campaña' : 'Wiki de la campaña'}</h2>
            <p className="muted">
              {mode === 'journal'
                ? 'Una nota por sesión. Escribe [[ para enlazar PNJ, lugares, misiones o personajes.'
                : 'Fichas de PNJ, lugares, misiones, facciones y objetos. Cada ficha muestra en qué notas se menciona.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function NoteListItem({ n }: { n: Note }) {
  const info = NOTE_TYPE_INFO[n.type];
  if (n.type === 'session') {
    return (
      <>
        <span className="notes-item-num">#{n.session?.number}</span>
        <span className="notes-item-body">
          <span className="notes-item-title">{n.title}</span>
          <span className="muted small">{formatSessionDate(n.session?.date)}</span>
        </span>
      </>
    );
  }
  return (
    <>
      <span className="notes-item-icon" aria-hidden>
        {info.icon}
      </span>
      <span className="notes-item-body">
        <span className="notes-item-title">{n.title}</span>
        <span className="muted small">
          {info.label}
          {n.quest && ` · ${QUEST_STATUS_LABEL[n.quest.status]}`}
        </span>
      </span>
    </>
  );
}
