// src/database/index.ts

import * as SQLite from 'expo-sqlite';
import { migrateDatabase, CURRENT_SCHEMA_VERSION } from './migrations';
import { dbLog, dbError } from '../lib/logger';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let migrationResult: { fromVersion: number; toVersion: number; migrationsRun: number } | null = null;

// Lightweight event emitter for DB layer
type DBEvent = 'dbReady' | 'itemsChanged' | 'migrationStart' | 'migrationComplete';
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
 * Initialize the SQLite database and run migrations.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  try {
    dbLog('Opening database...');
    db = await SQLite.openDatabaseAsync('wardrobe.db');
    
    // Run migrations
    dbLog('Running migrations...');
    dbEvents.emit('migrationStart');
    
    migrationResult = await migrateDatabase(db);
    
    // Always recreate the items_full view to repair any corruption
    // left by other branches or failed migrations
    await db.execAsync(`
      DROP VIEW IF EXISTS items_full;

      CREATE VIEW items_full AS
      SELECT 
        i.id, i.name, i.category, i.description, i.created_at, i.updated_at,
        m.attributes AS metadata,
        GROUP_CONCAT(DISTINCT t.name) AS tags,
        GROUP_CONCAT(DISTINCT ii.local_uri) AS images
      FROM items i
      LEFT JOIN metadata m ON m.item_id = i.id AND m.deleted = 0
      LEFT JOIN item_tags it ON it.item_id = i.id AND it.deleted = 0
      LEFT JOIN tags t ON t.id = it.tag_id AND t.deleted = 0
      LEFT JOIN item_images ii ON ii.item_id = i.id AND ii.deleted = 0
      WHERE i.deleted = 0
      GROUP BY i.id
      ORDER BY i.updated_at DESC;
    `);

    dbEvents.emit('migrationComplete', migrationResult);
    dbLog(`Database initialized (schema v${CURRENT_SCHEMA_VERSION})`);
    
    if (migrationResult.migrationsRun > 0) {
      dbLog(`Ran ${migrationResult.migrationsRun} migration(s): v${migrationResult.fromVersion} -> v${migrationResult.toVersion}`);
    }
    
    dbEvents.emit('dbReady');
    return db;
  } catch (err: unknown) {
    dbError('Failed to initialize database:', err);

    try {
      if (db && typeof (db as any).closeAsync === 'function') {
        await (db as any).closeAsync();
      }
    } catch {
      // ignore cleanup errors
    } finally {
      db = null;
      dbPromise = null;
    }

    throw err;
  }
}

/**
 * Get or initialize the shared DB instance.
 */
export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return Promise.resolve(db);

  if (!dbPromise) {
    dbLog('Database not initialized, initializing...');
    dbPromise = initDatabase();
  }

  return dbPromise;
}

/**
 * Get migration result (available after init)
 */
export function getMigrationResult() {
  return migrationResult;
}

/**
 * Get current schema version
 */
export function getSchemaVersion() {
  return CURRENT_SCHEMA_VERSION;
}
