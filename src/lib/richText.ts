// Utilidades sobre documentos TipTap (JSON de ProseMirror) sin depender del editor,
// para poder usarlas en la capa de datos y en los tests.

export interface RichNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  [key: string]: unknown;
}

export type MentionKind = 'note' | 'character';

export interface MentionRef {
  id: string;
  kind: MentionKind;
  label: string;
}

export const emptyDoc = (): RichNode => ({ type: 'doc', content: [{ type: 'paragraph' }] });

function walk(node: unknown, visit: (n: RichNode) => void): void {
  if (!node || typeof node !== 'object') return;
  const n = node as RichNode;
  visit(n);
  n.content?.forEach((child) => walk(child, visit));
}

export function extractMentions(doc: unknown): MentionRef[] {
  const out: MentionRef[] = [];
  walk(doc, (n) => {
    if (n.type === 'mention' && typeof n.attrs?.id === 'string') {
      out.push({
        id: n.attrs.id,
        kind: n.attrs.kind === 'character' ? 'character' : 'note',
        label: String(n.attrs.label ?? ''),
      });
    }
  });
  return out;
}

/** Ids enlazados, sin duplicados: alimentan el índice de backlinks. */
export const extractLinks = (doc: unknown): string[] => [...new Set(extractMentions(doc).map((m) => m.id))];

const BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock', 'taskItem']);

/** Texto plano para búsqueda y vistas previas. Las menciones aportan su etiqueta. */
export function plainText(doc: unknown): string {
  const parts: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as RichNode;
    if (n.type === 'text' && n.text) parts.push(n.text);
    else if (n.type === 'mention') parts.push(String(n.attrs?.label ?? ''));
    else if (n.type === 'hardBreak') parts.push('\n');
    n.content?.forEach(visit);
    if (n.type && BLOCKS.has(n.type)) parts.push('\n');
  };
  visit(doc);
  return parts.join('').replace(/\n{2,}/g, '\n').trim();
}

/** Devuelve una copia del documento con la etiqueta de las menciones a `id` actualizada. */
export function relabelMentions<T>(doc: T, id: string, label: string): { doc: T; changed: boolean } {
  let changed = false;
  const copy = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(copy);
    if (!node || typeof node !== 'object') return node;
    const n = node as RichNode;
    const out: RichNode = { ...n };
    if (n.type === 'mention' && n.attrs?.id === id && n.attrs.label !== label) {
      out.attrs = { ...n.attrs, label };
      changed = true;
    }
    if (n.content) out.content = n.content.map(copy) as RichNode[];
    return out;
  };
  const next = copy(doc) as T;
  return { doc: changed ? next : doc, changed };
}
