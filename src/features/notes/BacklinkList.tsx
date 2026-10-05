import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { NOTE_TYPE_INFO, notePath } from '../../db/notes';
import type { Id, Note } from '../../db/types';
import { plainText } from '../../lib/richText';

/** Lista de notas que mencionan algo, con un extracto. También la usa la hoja de personaje. */
export function BacklinkList({ notes, campaignId }: { notes: Note[] | undefined; campaignId: Id }) {
  if (!notes) return null;
  if (notes.length === 0) return <p className="muted small">Ninguna nota lo menciona todavía.</p>;
  return (
    <ul className="backlinks">
      {notes.map((n) => (
        <li key={n.id}>
          <Link to={`/c/${campaignId}/${notePath(n)}`}>
            <Icon name={NOTE_TYPE_INFO[n.type].icon} /> {n.title}
          </Link>
          <p className="muted small backlink-excerpt">{plainText(n.content).slice(0, 120)}</p>
        </li>
      ))}
    </ul>
  );
}
