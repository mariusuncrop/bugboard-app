import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeedDatabase } from './seed.js';
import type { Database } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.DATA_FILE
  ? resolve(process.env.DATA_FILE)
  : resolve(here, '../data/db.json');

/**
 * A JSON file standing in for a database. It keeps the app dependency-free and
 * makes `POST /api/test/reset` a single assignment, which is the whole point:
 * every test run starts from an identical, known state.
 */
let db: Database = load();

/**
 * A file written by an older build can be missing collections added since. Fill
 * them in rather than letting every request fail on an undefined array.
 */
function normalise(data: Partial<Database>): Database {
  const seeded = buildSeedDatabase();
  return {
    users: data.users ?? seeded.users,
    projects: data.projects ?? seeded.projects,
    issues: data.issues ?? [],
    comments: data.comments ?? [],
    attachments: data.attachments ?? [],
    links: data.links ?? [],
  };
}

function load(): Database {
  if (existsSync(dataFile)) {
    try {
      return normalise(JSON.parse(readFileSync(dataFile, 'utf8')) as Partial<Database>);
    } catch {
      console.warn(`[store] ${dataFile} was unreadable — falling back to the seed data.`);
    }
  }
  const fresh = buildSeedDatabase();
  persist(fresh);
  return fresh;
}

function persist(next: Database = db): void {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(next, null, 2), 'utf8');
}

export const store = {
  get data(): Database {
    return db;
  },

  /** Run a mutation and flush it to disk. */
  mutate<T>(fn: (data: Database) => T): T {
    const result = fn(db);
    persist();
    return result;
  },

  reset(): Database {
    db = buildSeedDatabase();
    persist();
    return db;
  },

  id(prefix: string): string {
    return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  },
};
