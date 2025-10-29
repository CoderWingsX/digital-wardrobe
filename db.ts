import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

// Initialize and return DB
export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('wardrobe.db');

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      name TEXT,
      description TEXT,
      category TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      pending_sync INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_remote_id INTEGER,
      attributes TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      pending_sync INTEGER DEFAULT 1,
      FOREIGN KEY(item_remote_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS item_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metadata_remote_id INTEGER,
      image_path TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      pending_sync INTEGER DEFAULT 1,
      FOREIGN KEY(metadata_remote_id) REFERENCES metadata(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      name TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      pending_sync INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS item_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metadata_remote_id INTEGER,
      item_remote_id INTEGER,
      tag_remote_id INTEGER,
      FOREIGN KEY(item_remote_id) REFERENCES items(id),
      FOREIGN KEY(tag_remote_id) REFERENCES tags(id),
      FOREIGN KEY(metadata_remote_id) REFERENCES metadata(id)
    );
  `);

  console.log('Local SQLite DB initialized');
  return db;
}

export function getDB() {
  if (!db) throw new Error('DB not initialized. Call initDatabase() first.');
  return db;
}
