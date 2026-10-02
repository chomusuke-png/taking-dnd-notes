import { useEffect, useState } from 'react';
import type { SrdCondition, SrdItem, SrdMonster, SrdSpell } from './types';

export type { SrdCondition, SrdItem, SrdMonster, SrdSpell } from './types';

interface SrdData {
  spells: SrdSpell[];
  monsters: SrdMonster[];
  items: SrdItem[];
  conditions: SrdCondition[];
}
export type SrdKind = keyof SrdData;

// Cada colección es un chunk aparte: se descarga la primera vez que se usa y queda en memoria.
const loaders: { [K in SrdKind]: () => Promise<SrdData[K]> } = {
  spells: () => import('./data/spells.json').then((m) => m.default as SrdSpell[]),
  monsters: () => import('./data/monsters.json').then((m) => m.default as SrdMonster[]),
  items: () => import('./data/items.json').then((m) => m.default as SrdItem[]),
  conditions: () => import('./data/conditions.json').then((m) => m.default as SrdCondition[]),
};

const cache: Partial<{ [K in SrdKind]: Promise<SrdData[K]> }> = {};
const byIdCache = new Map<SrdKind, Map<string, unknown>>();

export function loadSrd<K extends SrdKind>(kind: K): Promise<SrdData[K]> {
  return (cache[kind] ??= loaders[kind]() as never) as Promise<SrdData[K]>;
}

export async function loadSrdIndex<K extends SrdKind>(kind: K): Promise<Map<string, SrdData[K][number]>> {
  const list = await loadSrd(kind);
  let map = byIdCache.get(kind);
  if (!map) {
    map = new Map(list.map((e) => [e.id, e]));
    byIdCache.set(kind, map);
  }
  return map as Map<string, SrdData[K][number]>;
}

/** Colección del SRD (undefined mientras carga o si `enabled` es false). */
export function useSrd<K extends SrdKind>(kind: K, enabled = true): SrdData[K] | undefined {
  const [data, setData] = useState<SrdData[K] | undefined>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void loadSrd(kind).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [kind, enabled]);
  return data;
}

/** Índice por id de una colección del SRD (undefined mientras carga). */
export function useSrdIndex<K extends SrdKind>(kind: K): Map<string, SrdData[K][number]> | undefined {
  const [data, setData] = useState<Map<string, SrdData[K][number]> | undefined>();
  useEffect(() => {
    let alive = true;
    void loadSrdIndex(kind).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [kind]);
  return data;
}
