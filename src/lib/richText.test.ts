import { describe, expect, it } from 'vitest';
import { extractLinks, extractMentions, plainText, relabelMentions } from './richText';

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'La cueva' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hablamos con ' },
        { type: 'mention', attrs: { id: 'n1', label: 'Sildar', kind: 'note' } },
        { type: 'text', text: ' y con ' },
        { type: 'mention', attrs: { id: 'c1', label: 'Thorin', kind: 'character' } },
      ],
    },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: 'n1', label: 'Sildar' } }] }] }] },
  ],
};

describe('richText', () => {
  it('extrae menciones con su tipo', () => {
    expect(extractMentions(doc).map((m) => [m.id, m.kind])).toEqual([['n1', 'note'], ['c1', 'character'], ['n1', 'note']]);
  });

  it('enlaces sin duplicados', () => {
    expect(extractLinks(doc)).toEqual(['n1', 'c1']);
    expect(extractLinks(null)).toEqual([]);
  });

  it('texto plano con saltos por bloque', () => {
    expect(plainText(doc)).toBe('La cueva\nHablamos con Sildar y con Thorin\nSildar');
  });

  it('reetiqueta menciones sin mutar el original', () => {
    const { doc: next, changed } = relabelMentions(doc, 'n1', 'Sildar Hallwinter');
    expect(changed).toBe(true);
    expect(plainText(next)).toContain('Sildar Hallwinter');
    expect(plainText(doc)).not.toContain('Hallwinter');
    expect(relabelMentions(doc, 'zz', 'x').changed).toBe(false);
  });
});
