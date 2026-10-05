import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/Dialog';
import { ListField, NumberField, TextField } from '../../components/fields';
import { db } from '../../db/db';
import { NOTE_TYPE_INFO, QUEST_STATUS_LABEL, backlinks, deleteNote, notePath, updateNote, type NotePatch } from '../../db/notes';
import { NOTE_TYPES, type Id, type Note, type NoteType } from '../../db/types';
import { useUi } from '../../store/ui';
import { BacklinkList } from './BacklinkList';
import { RichEditor } from './editor/RichEditor';

interface Props {
  noteId: Id;
  campaignId: Id;
  backTo: string;
}

export function NoteView({ noteId, campaignId, backTo }: Props) {
  const note = useLiveQuery(async () => (await db.notes.get(noteId)) ?? null, [noteId]);
  const navigate = useNavigate();
  const toast = useUi((s) => s.toast);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (note === undefined) return null;
  if (note === null) {
    return (
      <div className="placeholder">
        <h2>Nota no encontrada</h2>
        <p className="muted">Puede que se haya eliminado.</p>
        <Link className="btn" to={backTo}>
          ← Volver
        </Link>
      </div>
    );
  }

  const patch = (p: NotePatch) => void updateNote(note.id, p);

  async function openLink(target: { id: Id; kind: 'note' | 'character' }) {
    if (target.kind === 'character') {
      if (await db.characters.get(target.id)) navigate(`/c/${campaignId}/personajes/${target.id}`);
      else toast('Ese personaje ya no existe.', 'error');
      return;
    }
    const n = await db.notes.get(target.id);
    if (n) navigate(`/c/${campaignId}/${notePath(n)}`);
    else toast('Esa nota ya no existe.', 'error');
  }

  return (
    <div className="note-view">
      <div className="note-header">
        <Link to={backTo} className="note-back muted">
          ← {note.type === 'session' ? 'Diario' : 'Wiki'}
        </Link>
        <div className="note-title-row">
          <span className="note-type-icon" aria-hidden>
            <Icon name={NOTE_TYPE_INFO[note.type].icon} />
          </span>
          <TextField className="note-title-input" aria-label="Título" value={note.title} onCommit={(title) => patch({ title })} />
        </div>
        <div className="note-header-actions">
          <span className="muted small save-state" aria-live="polite">
            {dirty ? 'Guardando…' : 'Guardado'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
            Eliminar
          </button>
        </div>
      </div>

      <div className="note-layout">
        <div className="note-body">
          <RichEditor
            key={note.id}
            campaignId={campaignId}
            noteId={note.id}
            content={note.content}
            onSave={(content) => patch({ content })}
            onDirtyChange={setDirty}
            onLinkClick={(t) => void openLink(t)}
          />
        </div>
        <aside className="note-side">
          <NoteMeta note={note} patch={patch} />
          <Backlinks note={note} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar nota"
        danger
        confirmLabel="Eliminar"
        message={
          <p>
            Se eliminará <strong>{note.title}</strong>. Los enlaces [[...]] que apuntan a ella dejarán de funcionar.
          </p>
        }
        onConfirm={() => {
          navigate(backTo);
          void deleteNote(note.id).then(() => toast(`"${note.title}" eliminada.`));
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function NoteMeta({ note, patch }: { note: Note; patch: (p: NotePatch) => void }) {
  const characters = useLiveQuery(
    () => (note.type === 'npc' ? db.characters.where('campaignId').equals(note.campaignId).sortBy('name') : []),
    [note.campaignId, note.type],
  );

  return (
    <div className="side-card">
      <h3 className="side-title">Detalles</h3>

      {note.type === 'session' ? (
        <div className="meta-grid">
          <label className="field">
            <span className="field-label">N.º</span>
            <NumberField
              className="input input-sm"
              min={1}
              max={9999}
              value={note.session?.number ?? 1}
              onCommit={(number) => patch({ session: { ...note.session!, number } })}
            />
          </label>
          <label className="field">
            <span className="field-label">Fecha</span>
            <input
              className="input input-sm"
              type="date"
              value={note.session?.date ?? ''}
              onChange={(e) => patch({ session: { ...note.session!, date: e.target.value } })}
            />
          </label>
        </div>
      ) : (
        <label className="field">
          <span className="field-label">Tipo</span>
          <select className="input input-sm" value={note.type} onChange={(e) => patch({ type: e.target.value as NoteType })}>
            {NOTE_TYPES.filter((t) => t !== 'session').map((t) => (
              <option key={t} value={t}>
                {NOTE_TYPE_INFO[t].label}
              </option>
            ))}
          </select>
        </label>
      )}

      {note.type === 'quest' && (
        <label className="field">
          <span className="field-label">Estado</span>
          <select
            className="input input-sm"
            value={note.quest?.status ?? 'active'}
            onChange={(e) => patch({ quest: { status: e.target.value as keyof typeof QUEST_STATUS_LABEL } })}
          >
            {Object.entries(QUEST_STATUS_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      {note.type === 'npc' && (
        <label className="field">
          <span className="field-label">Hoja de estadísticas</span>
          <select
            className="input input-sm"
            value={note.characterId ?? ''}
            onChange={(e) => patch({ characterId: e.target.value || undefined })}
          >
            <option value="">Sin hoja</option>
            {characters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.kind === 'npc' ? '(PNJ)' : ''}
              </option>
            ))}
          </select>
          {note.characterId && (
            <Link className="btn btn-sm" to={`/c/${note.campaignId}/personajes/${note.characterId}`}>
              Abrir hoja →
            </Link>
          )}
        </label>
      )}

      <label className="field">
        <span className="field-label">Etiquetas</span>
        <ListField className="input input-sm" value={note.tags} onCommit={(tags) => patch({ tags })} placeholder="phandalin, acto-1" />
      </label>
      {note.type !== 'session' && (
        <label className="field">
          <span className="field-label">Alias (otros nombres para buscar y enlazar)</span>
          <ListField className="input input-sm" value={note.aliases} onCommit={(aliases) => patch({ aliases })} placeholder="El Mago Negro" />
        </label>
      )}
    </div>
  );
}

function Backlinks({ note }: { note: Note }) {
  const linking = useLiveQuery(() => backlinks(note.id), [note.id]);
  return (
    <div className="side-card">
      <h3 className="side-title">
        Mencionado en <span className="muted small">{linking?.length ?? 0}</span>
      </h3>
      <BacklinkList notes={linking} campaignId={note.campaignId} />
    </div>
  );
}
