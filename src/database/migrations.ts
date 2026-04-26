// src/database/migrations.ts

import * as SQLite from 'expo-sqlite';
import { dbLog, dbError } from '../lib/logger';

export const CURRENT_SCHEMA_VERSION = 3;

interface Migration {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial offline-first schema with clean naming',
    up: async (db: SQLite.SQLiteDatabase) => {
      // This migration handles both fresh installs and existing databases
      // For existing DBs, we rename columns and remove unused ones

      // Check if this is a fresh install or migration from old schema
      const tables = await db.getAllAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='items'`,
      );

      if (tables.length === 0) {
        // Fresh install - create clean schema
        await createFreshSchema(db);
      } else {
        // Existing DB - migrate from old schema
        await migrateFromOldSchema(db);
      }
    },
  },
  {
    version: 2,
    description: 'Create items_full view',
    up: async (db: SQLite.SQLiteDatabase) => {
      dbLog('Creating items_full view...');
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
      dbLog('items_full view created');
    },
  },
  {
    version: 3,
    description: 'Remove legacy schema_info table (now using PRAGMA user_version)',
    up: async (db: SQLite.SQLiteDatabase) => {
      dbLog('Removing legacy schema_info table...');
      await db.execAsync(`DROP TABLE IF EXISTS schema_info`);
      dbLog('Legacy schema_info table removed');
    },
  },
];

async function createFreshSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  dbLog('Creating fresh offline-first schema...');

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      attributes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      local_uri TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS item_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(item_id, tag_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
    CREATE INDEX IF NOT EXISTS idx_metadata_item_id ON metadata(item_id);
    CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
    CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

    -- View for loading items with all related data
    CREATE VIEW IF NOT EXISTS items_full AS
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

  dbLog('Fresh schema created successfully');
}

async function migrateFromOldSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  dbLog('Migrating from old schema to offline-first schema...');

  // SQLite doesn't support DROP COLUMN or RENAME COLUMN well in older versions
  // We use the "create new table, copy data, drop old, rename" approach

  await db.execAsync(`PRAGMA foreign_keys = OFF;`);

  try {
    // 1. Migrate items table (remove user_id, pending_sync)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      );
      
      INSERT INTO items_new (id, name, description, category, created_at, updated_at, deleted)
      SELECT id, COALESCE(name, ''), description, category, 
             COALESCE(created_at, ${Date.now()}), 
             COALESCE(updated_at, ${Date.now()}), 
             COALESCE(deleted, 0)
      FROM items;
      
      DROP TABLE items;
      ALTER TABLE items_new RENAME TO items;
    `);

    // 2. Migrate metadata table (rename item_remote_id -> item_id, remove pending_sync)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS metadata_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        attributes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
      );
      
      INSERT INTO metadata_new (id, item_id, attributes, created_at, updated_at, deleted)
      SELECT id, item_remote_id, attributes, 
             COALESCE(created_at, ${Date.now()}), 
             COALESCE(updated_at, ${Date.now()}), 
             COALESCE(deleted, 0)
      FROM metadata WHERE item_remote_id IS NOT NULL;
      
      DROP TABLE metadata;
      ALTER TABLE metadata_new RENAME TO metadata;
    `);

    // 3. Migrate item_images table (rename item_remote_id -> item_id, add is_primary)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS item_images_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        local_uri TEXT NOT NULL,
        is_primary INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
      );
      
      INSERT INTO item_images_new (id, item_id, local_uri, is_primary, created_at, updated_at, deleted)
      SELECT id, item_remote_id, COALESCE(local_uri, ''), 0, 
             COALESCE(created_at, ${Date.now()}), 
             COALESCE(updated_at, ${Date.now()}), 
             COALESCE(deleted, 0)
      FROM item_images WHERE item_remote_id IS NOT NULL;
      
      DROP TABLE item_images;
      ALTER TABLE item_images_new RENAME TO item_images;
    `);

    // 4. Migrate tags table (remove user_id, pending_sync, add UNIQUE on name)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      );
      
      INSERT OR IGNORE INTO tags_new (id, name, created_at, updated_at, deleted)
      SELECT id, COALESCE(name, ''), 
             COALESCE(created_at, ${Date.now()}), 
             COALESCE(updated_at, ${Date.now()}), 
             COALESCE(deleted, 0)
      FROM tags WHERE name IS NOT NULL AND name != '';
      
      DROP TABLE tags;
      ALTER TABLE tags_new RENAME TO tags;
    `);

    // 5. Migrate item_tags table (rename columns, add unique constraint)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS item_tags_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(item_id, tag_id)
      );
      
      INSERT OR IGNORE INTO item_tags_new (id, item_id, tag_id, created_at, updated_at, deleted)
      SELECT id, item_remote_id, tag_remote_id, 
             COALESCE(created_at, ${Date.now()}), 
             COALESCE(updated_at, ${Date.now()}), 
             COALESCE(deleted, 0)
      FROM item_tags 
      WHERE item_remote_id IS NOT NULL AND tag_remote_id IS NOT NULL;
      
      DROP TABLE item_tags;
      ALTER TABLE item_tags_new RENAME TO item_tags;
    `);

    // 6. Create indexes
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
      CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
      CREATE INDEX IF NOT EXISTS idx_metadata_item_id ON metadata(item_id);
      CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
      CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    `);

    // 7. Recreate view with new column names
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
  } finally {
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
  }

  dbLog('Migration from old schema completed successfully');
}

/**
 * Get current schema version using PRAGMA user_version (SQLite standard).
 * For backward compatibility, also checks legacy schema_info table.
 */
export async function getCurrentVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  // First check PRAGMA user_version
  const result = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`);
  const pragmaVersion = result?.user_version ?? 0;

  if (pragmaVersion > 0) {
    return pragmaVersion;
  }

  // Fall back to legacy schema_info table for existing users
  try {
    const legacyResult = await db.getFirstAsync<{ version: number }>(
      `SELECT MAX(version) as version FROM schema_info`,
    );
    const legacyVersion = legacyResult?.version ?? 0;

    // Migrate the version to PRAGMA user_version
    if (legacyVersion > 0) {
      await db.execAsync(`PRAGMA user_version = ${legacyVersion}`);
      dbLog(`Migrated version ${legacyVersion} from schema_info to PRAGMA user_version`);
    }

    return legacyVersion;
  } catch {
    // schema_info table doesn't exist, fresh install
    return 0;
  }
}

/**
 * Set schema version using PRAGMA user_version (SQLite standard).
 */
export async function setVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<{
  fromVersion: number;
  toVersion: number;
  migrationsRun: number;
}> {
  const currentVersion = await getCurrentVersion(db);
  let migrationsRun = 0;

  dbLog(`Current schema version: ${currentVersion}, Target: ${CURRENT_SCHEMA_VERSION}`);

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    dbLog('Database is up to date');
    return { fromVersion: currentVersion, toVersion: currentVersion, migrationsRun: 0 };
  }

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      dbLog(`Running migration v${migration.version}: ${migration.description}`);

      try {
        await migration.up(db);
        await setVersion(db, migration.version);
        migrationsRun++;
        dbLog(`Migration v${migration.version} completed`);
      } catch (err) {
        dbError(`Migration v${migration.version} failed:`, err);
        throw new Error(`Migration v${migration.version} failed: ${err}`);
      }
    }
  }

  return {
    fromVersion: currentVersion,
    toVersion: CURRENT_SCHEMA_VERSION,
    migrationsRun,
  };
}
