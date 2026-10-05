import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { SuggestionProps } from '@tiptap/suggestion';
import { Icon } from '../../../components/Icon';
import type { LinkItem } from './wikiLink';

export interface LinkSuggestionsHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/** Menú de autocompletado que aparece al escribir [[ en el editor. */
export const LinkSuggestions = forwardRef<LinkSuggestionsHandle, SuggestionProps<LinkItem>>(function LinkSuggestions(
  { items, command, loading },
  ref,
) {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [items]);

  const pick = (i: number) => {
    const item = items[i];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="link-suggestions" role="listbox" aria-label="Enlazar a">
      {items.length === 0 ? (
        <div className="link-suggestion-empty muted">{loading ? 'Buscando…' : 'Escribe para buscar o crear una nota'}</div>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={i === selected}
            className={`link-suggestion${i === selected ? ' is-selected' : ''}${item.create ? ' is-create' : ''}`}
            onMouseEnter={() => setSelected(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(i)}
          >
            <span className="link-suggestion-icon" aria-hidden>
              <Icon name={item.icon} />
            </span>
            <span className="link-suggestion-label">{item.create ? `Crear «${item.label}»` : item.label}</span>
            <span className="muted small">{item.hint}</span>
          </button>
        ))
      )}
    </div>
  );
});
