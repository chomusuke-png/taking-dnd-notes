// Descarga el SRD 5.1 (2014, inglés) de 5e-bits/5e-database y genera src/srd/data/*.json.
// Uso: npm run srd   (requiere Node 23.6+ por la ejecución directa de TypeScript)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  transformCondition, transformEquipment, transformMagicItem, transformMonster, transformSpell,
} from '../src/srd/transform.ts';

const SOURCE = 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'srd', 'data');

async function fetchJson(name: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${SOURCE}/5e-SRD-${name}.json`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>[];
}

const byName = <T extends { name: string }>(list: T[]) => list.sort((a, b) => a.name.localeCompare(b.name, 'en'));

async function main() {
  const [spells, monsters, equipment, magicItems, conditions] = await Promise.all(
    ['Spells', 'Monsters', 'Equipment', 'Magic-Items', 'Conditions'].map(fetchJson),
  );
  const outputs = {
    spells: byName(spells.map(transformSpell)),
    monsters: byName(monsters.map(transformMonster)),
    items: byName([...equipment.map(transformEquipment), ...magicItems.map(transformMagicItem)]),
    conditions: byName(conditions.map(transformCondition)),
  };
  await mkdir(OUT, { recursive: true });
  for (const [name, data] of Object.entries(outputs)) {
    const file = join(OUT, `${name}.json`);
    await writeFile(file, JSON.stringify(data));
    console.log(`${name}: ${data.length} entradas → ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
