import { afterEach } from 'vitest';
import { GrimorioDB } from '../db/db';

const opened: GrimorioDB[] = [];

/** Base de datos aislada por test (fake-indexeddb). */
export function makeTestDb(): GrimorioDB {
  const database = new GrimorioDB(`test-${crypto.randomUUID()}`);
  opened.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((d) => d.delete()));
});
