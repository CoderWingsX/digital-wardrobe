// src/database/index.ts

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLE_STATEMENTS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Lightweight event emitter for DB layer (optional: non-React listeners)
type DBEvent = 'dbReady' | 'itemsChanged';
const listeners: { [K in DBEvent]?: ((payload?: any) => void)[] } = {};

export const dbEvents = {
  on(event: DBEvent, cb: (payload?: any) => void) {
    (listeners[event] ||= []).push(cb);
    return () => {
      const arr = listeners[event];
      if (!arr) return;
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    };
  },
  emit(event: DBEvent, payload?: any) {
    const arr = listeners[event];
    if (!arr) return;
    for (const cb of arr.slice()) cb(payload);
  },
};

/**
 * Initialize the SQLite database (only once).
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  try {
    db = await SQLite.openDatabaseAsync('wardrobe.db');
    await db.execAsync(CREATE_TABLE_STATEMENTS);
    console.log('[db] initialized');
    dbEvents.emit('dbReady');
    return db;
  } catch (err: unknown) {
    console.error('[db] failed to initialize:', err);

    try {
      if (db && typeof (db as any).closeAsync === 'function') {
        await (db as any).closeAsync();
      }
    } catch {
      // ignore cleanup errors
    } finally {
      db = null;
    }

    throw err;
  }
}

/**
 * Get or initialize the shared DB instance.
 * This function always resolves to a valid SQLiteDatabase.
 */
export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return Promise.resolve(db);

  if (!dbPromise) {
    console.warn('[db] not initialized, initializing...');
    dbPromise = initDatabase();
  }

  return dbPromise;
}
