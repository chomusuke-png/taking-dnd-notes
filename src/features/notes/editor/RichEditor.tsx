import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef } from 'react';
import type { Id } from '../../../db/types';
import { createWikiLink } from './wikiLink';
import './editor.css';

interface Props {
  campaignId: Id;
  noteId: Id;
  content: unknown;
  /** Se llama con el documento ya "asentado" (con debounce). */
  onSave: (doc: unknown) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onLinkClick: (target: { id: Id; kind: 'note' | 'character' }) => void;
}

const SAVE_DELAY = 600;

/**
 * Editor de texto enriquecido de una nota. Se monta una vez por nota (el padre usa
 * key={noteId}); guarda con debounce y vacía lo pendiente al desmontarse.
 */
export function RichEditor({ campaignId, noteId, content, onSave, onDirtyChange, onLinkClick }: Props) {
  const pending = useRef<unknown>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const dirtyRef = useRef(onDirtyChange);
  dirtyRef.current = onDirtyChange;

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current !== null) {
      saveRef.current(pending.current);
      pending.current = null;
      dirtyRef.current?.(false);
    }
  };

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: true } }),
      Placeholder.configure({ placeholder: 'Escribe aquí… usa [[ para enlazar PNJ, lugares, misiones o personajes.' }),
      createWikiLink(campaignId, noteId),
    ],
    [campaignId, noteId],
  );

  const editor = useEditor({
    extensions,
    content: (content as object) ?? '',
    onUpdate: ({ editor: e }) => {
      pending.current = e.getJSON();
      dirtyRef.current?.(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY);
    },
    editorProps: { attributes: { class: 'rich-content', spellcheck: 'true' } },
  });

  // Guardar lo pendiente al cambiar de nota, cerrar la pestaña o salir de la pantalla.
  useEffect(() => {
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  return (
    <div className="rich-editor">
      {editor && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="rich-editor-body"
        onClick={(e) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>('.wikilink');
          if (!el?.dataset.id) return;
          e.preventDefault();
          flush();
          onLinkClick({ id: el.dataset.id, kind: el.dataset.kind === 'character' ? 'character' : 'note' });
        }}
      />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
    }),
  });

  const buttons: { key: keyof typeof state; label: string; title: string; run: () => void }[] = [
    { key: 'h1', label: 'H1', title: 'Título', run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { key: 'h2', label: 'H2', title: 'Subtítulo', run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: 'h3', label: 'H3', title: 'Encabezado menor', run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: 'bold', label: 'B', title: 'Negrita (Ctrl+B)', run: () => editor.chain().focus().toggleBold().run() },
    { key: 'italic', label: 'I', title: 'Cursiva (Ctrl+I)', run: () => editor.chain().focus().toggleItalic().run() },
    { key: 'strike', label: 'S', title: 'Tachado', run: () => editor.chain().focus().toggleStrike().run() },
    { key: 'bullet', label: '•', title: 'Lista', run: () => editor.chain().focus().toggleBulletList().run() },
    { key: 'ordered', label: '1.', title: 'Lista numerada', run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: 'quote', label: '❝', title: 'Cita', run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formato">
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          className={`tool tool-${b.key}${state[b.key] ? ' is-active' : ''}`}
          title={b.title}
          aria-pressed={state[b.key]}
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
        >
          {b.label}
        </button>
      ))}
      <button
        type="button"
        className="tool tool-link"
        title="Enlazar nota o personaje ([[)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().insertContent('[[').run()}
      >
        [[ ]]
      </button>
    </div>
  );
}
