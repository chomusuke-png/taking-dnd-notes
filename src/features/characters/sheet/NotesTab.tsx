import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { db } from '../../../db/db';
import { backlinks, notePath } from '../../../db/notes';
import { BacklinkList } from '../../notes/BacklinkList';
import { useSheet } from './SheetContext';

/** Fichas wiki asociadas al personaje y notas que lo mencionan con [[...]]. */
export function NotesTab() {
  const { c } = useSheet();
  const profiles = useLiveQuery(
    () => db.notes.where('campaignId').equals(c.campaignId).filter((n) => n.characterId === c.id).toArray(),
    [c.campaignId, c.id],
  );
  const mentions = useLiveQuery(() => backlinks(c.id), [c.id]);

  return (
    <div className="sheet-notes">
      {profiles && profiles.length > 0 && (
        <>
          <h3 className="panel-title">Ficha en la wiki</h3>
          <ul className="backlinks">
            {profiles.map((n) => (
              <li key={n.id}>
                <Link to={`/c/${c.campaignId}/${notePath(n)}`}><Icon name="npc" /> {n.title}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="panel-title">
        Mencionado en <span className="muted small">{mentions?.length ?? 0}</span>
      </h3>
      <BacklinkList notes={mentions} campaignId={c.campaignId} />
      <p className="muted small hint">
        Escribe [[{c.name}]] en el diario o la wiki para que aparezca aquí. Para un PNJ, enlaza su hoja desde los detalles
        de su ficha en la wiki.
      </p>
    </div>
  );
}
