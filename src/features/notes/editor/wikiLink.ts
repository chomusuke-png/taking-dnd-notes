import { mergeAttributes } from '@tiptap/core';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { db } from '../../../db/db';
import { NOTE_TYPE_INFO, createNote } from '../../../db/notes';
import type { Id } from '../../../db/types';
import { newId } from '../../../lib/id';
import { fold } from '../../../lib/text';
import { LinkSuggestions, type LinkSuggestionsHandle } from './LinkSuggestions';

export interface LinkItem {
  id: Id;
  label: string;
  kind: 'note' | 'character';
  /** Texto secundario: tipo de nota o "Personaje". */
  hint: string;
  icon: string;
  /** Si es true, al elegirlo se crea una nota nueva con este título. */
  create?: boolean;
}


const MAX_ITEMS = 8;

/** Busca notas (por título o alias) y personajes de la campaña que coincidan con la consulta. */
export async function findLinkTargets(campaignId: Id, rawQuery: string, excludeId?: Id): Promise<LinkItem[]> {
  const query = rawQuery.replace(/\]+$/, '').trim();
  const q = fold(query);
  const [notes, characters] = await Promise.all([
    db.notes.where('campaignId').equals(campaignId).toArray(),
    db.characters.where('campaignId').equals(campaignId).toArray(),
  ]);

  const scored: (LinkItem & { score: number })[] = [];
  const score = (names: string[]) => {
    let best = -1;
    for (const name of names) {
      const n = fold(name);
      if (!q) best = Math.max(best, 1);
      else if (n === q) best = Math.max(best, 3);
      else if (n.startsWith(q)) best = Math.max(best, 2);
      else if (n.includes(q)) best = Math.max(best, 1);
    }
    return best;
  };

  for (const n of notes) {
    if (n.id === excludeId) continue;
    const s = score([n.title, ...n.aliases]);
    if (s >= 0) {
      const info = NOTE_TYPE_INFO[n.type];
      scored.push({ id: n.id, label: n.title, kind: 'note', hint: info.label, icon: info.icon, score: s + n.updatedAt / 1e15 });
    }
  }
  for (const c of characters) {
    const s = score([c.name]);
    if (s >= 0) {
      scored.push({
        id: c.id, label: c.name, kind: 'character', hint: c.kind === 'pc' ? 'Personaje' : 'PNJ (hoja)', icon: '🧙', score: s,
      });
    }
  }

  const items: LinkItem[] = scored.sort((a, b) => b.score - a.score).slice(0, MAX_ITEMS);
  if (query && !items.some((i) => fold(i.label) === q)) {
    items.push({ id: newId(), label: query, kind: 'note', hint: 'Crear nota nueva', icon: '＋', create: true });
  }
  return items;
}

/**
 * Enlaces internos estilo wiki: se escriben con `[[`, se guardan como nodo `mention`
 * con el atributo extra `kind` (nota o personaje) y se muestran como [[Etiqueta]].
 */
export function createWikiLink(campaignId: Id, currentNoteId?: Id) {
  return Mention.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        kind: {
          default: 'note',
          parseHTML: (el: HTMLElement) => el.getAttribute('data-kind') ?? 'note',
          renderHTML: (attrs: Record<string, unknown>) => ({ 'data-kind': attrs.kind }),
        },
      };
    },
  }).configure({
    HTMLAttributes: { class: 'wikilink' },
    renderText: ({ node }) => `[[${node.attrs.label ?? ''}]]`,
    renderHTML: ({ options, node }) => ['span', mergeAttributes(options.HTMLAttributes, { role: 'link', tabindex: '0' }), node.attrs.label ?? '…'],
    suggestion: {
      char: '[[',
      allowSpaces: true,
      allowedPrefixes: null,
      items: ({ query }) => findLinkTargets(campaignId, query, currentNoteId),
      command: ({ editor, range, props }) => {
        const item = props as unknown as LinkItem;
        if (item.create) void createNote(campaignId, { type: 'free', title: item.label, id: item.id });
        // Si el usuario ya escribió los ]] de cierre, se incluyen en el rango a reemplazar.
        const after = editor.state.doc.textBetween(range.to, Math.min(range.to + 2, editor.state.doc.content.size));
        const to = range.to + (after.match(/^\]{1,2}/)?.[0].length ?? 0);
        editor
          .chain()
          .focus()
          .insertContentAt({ from: range.from, to }, [
            { type: 'mention', attrs: { id: item.id, label: item.label, kind: item.kind, mentionSuggestionChar: '[[' } },
            { type: 'text', text: ' ' },
          ])
          .run();
      },
      render: () => {
        let component: ReactRenderer<LinkSuggestionsHandle> | undefined;
        let unmount: (() => void) | undefined;
        return {
          onStart: (props: SuggestionProps<LinkItem>) => {
            component = new ReactRenderer(LinkSuggestions, { props, editor: props.editor });
            unmount = props.mount(component.element as HTMLElement);
          },
          onUpdate: (props: SuggestionProps<LinkItem>) => component?.updateProps(props),
          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === 'Escape') return false;
            return component?.ref?.onKeyDown(props.event) ?? false;
          },
          onExit: () => {
            unmount?.();
            component?.destroy();
          },
        };
      },
    },
  });
}
