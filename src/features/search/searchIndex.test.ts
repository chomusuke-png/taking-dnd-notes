import { describe, expect, it } from 'vitest';
import { newCharacter } from '../../db/factories';
import type { Note } from '../../db/types';
import { buildIndex, excerpt, toSearchDocs } from './searchIndex';

const note = (id: string, title: string, text: string, extra: Partial<Note> = {}): Note => ({
  id, campaignId: 'c', type: 'npc', title, aliases: [], tags: [], links: [], createdAt: 0, updatedAt: 0,
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  ...extra,
});

describe('búsqueda global', () => {
  const docs = toSearchDocs(
    [
      note('n1', 'Sildar Hallwinter', 'Caballero de la Alianza de los Lores', { aliases: ['El viejo soldado'] }),
      note('n2', 'Phandalin', 'Pueblo minero. Sildar se aloja en la posada.', { type: 'location', tags: ['acto-1'] }),
      note('s1', 'Sesión 1', 'Emboscada goblin en el camino de Triboar', { type: 'session', session: { number: 1, date: '2026-10-01' } }),
    ],
    [{ ...newCharacter('c', { name: 'Thorin' }), id: 'c1', race: 'Enano' }],
  );
  const index = buildIndex(docs);
  const ids = (q: string) => index.search(q).map((r) => r.id);

  it('el título pesa más que el cuerpo', () => {
    expect(ids('sildar')[0]).toBe('n1');
    expect(ids('sildar')).toContain('n2');
  });

  it('ignora tildes, admite prefijos y pequeños errores', () => {
    expect(ids('phandal')).toEqual(['n2']);
    expect(ids('sesion')).toContain('s1');
    expect(ids('goblim')).toContain('s1');
  });

  it('busca alias, etiquetas y personajes', () => {
    expect(ids('viejo soldado')).toEqual(['n1']);
    expect(ids('acto-1')).toContain('n2');
    expect(ids('enano')).toEqual(['c1']);
  });

  it('las rutas apuntan a la sección correcta', () => {
    expect(docs.find((d) => d.id === 's1')?.path).toBe('diario/s1');
    expect(docs.find((d) => d.id === 'n2')?.path).toBe('wiki/n2');
    expect(docs.find((d) => d.id === 'c1')?.path).toBe('personajes/c1');
  });

  it('extracto alrededor de la coincidencia', () => {
    expect(excerpt('a'.repeat(100) + ' Sildar llega', 'sildar')).toContain('Sildar llega');
  });
});
