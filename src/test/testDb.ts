import { afterEach } from 'vitest';
import { AppDB } from '../db/db';

const opened: AppDB[] = [];

/** Base de datos aislada por test (fake-indexeddb). */
export function makeTestDb(): AppDB {
  const database = new AppDB(`test-${crypto.randomUUID()}`);
  opened.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((d) => d.delete()));
});
