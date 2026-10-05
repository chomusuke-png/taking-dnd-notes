import type { IconName } from '../../components/Icon';
import { fold } from '../../lib/text';
import MiniSearch from 'minisearch';
import { NOTE_TYPE_INFO, notePath } from '../../db/notes';
import type { Character, Note } from '../../db/types';
import { className } from '../../rules/classes';
import { plainText } from '../../lib/richText';

export interface SearchDoc {
  id: string;
  kind: 'note' | 'character';
  title: string;
  aliases: string;
  tags: string;
  body: string;
  /** Ruta relativa a la campaña. */
  path: string;
  icon: IconName;
  hint: string;
  updatedAt: number;
}

export function toSearchDocs(notes: Note[], characters: Character[]): SearchDoc[] {
  return [
    ...notes.map((n) => ({
      id: n.id,
      kind: 'note' as const,
      title: n.title,
      aliases: n.aliases.join(' '),
      tags: n.tags.join(' '),
      body: plainText(n.content),
      path: notePath(n),
      icon: NOTE_TYPE_INFO[n.type].icon,
      hint: n.type === 'session' ? `Sesión ${n.session?.number ?? ''}` : NOTE_TYPE_INFO[n.type].label,
      updatedAt: n.updatedAt,
    })),
    ...characters.map((c) => ({
      id: c.id,
      kind: 'character' as const,
      title: c.name,
      aliases: [c.race, c.player].join(' '),
      tags: '',
      body: [c.background, ...c.classes.map(className), ...c.features.map((f) => f.name)].join(' '),
      path: `personajes/${c.id}`,
      icon: 'characters' as const,
      hint: c.kind === 'pc' ? 'Personaje' : 'PNJ (hoja)',
      updatedAt: c.updatedAt,
    })),
  ];
}

export function buildIndex(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'aliases', 'tags', 'body'],
    storeFields: ['id'],
    processTerm: (term) => fold(term),
    searchOptions: { boost: { title: 4, aliases: 3, tags: 2 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  index.addAll(docs);
  return index;
}

/** Fragmento del cuerpo alrededor de la primera coincidencia de algún término. */
export function excerpt(body: string, query: string, size = 90): string {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const folded = fold(body);
  const at = terms.map((t) => folded.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return body.slice(0, size);
  const start = Math.max(0, at - 30);
  return (start > 0 ? '…' : '') + body.slice(start, start + size).replace(/\n/g, ' ') + (start + size < body.length ? '…' : '');
}
