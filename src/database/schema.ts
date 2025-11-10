// src/database/schema.ts

/**
 * Contains the complete SQL schema for the local database.
 * Kept separate for clarity.
 */
export const CREATE_TABLE_STATEMENTS = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    pending_sync INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_remote_id INTEGER,
    attributes TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    pending_sync INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(item_remote_id) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS item_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metadata_remote_id INTEGER,
    image_path TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    pending_sync INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(metadata_remote_id) REFERENCES metadata(id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    pending_sync INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metadata_remote_id INTEGER,
    item_remote_id INTEGER,
    tag_remote_id INTEGER,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(item_remote_id) REFERENCES items(id),
    FOREIGN KEY(tag_remote_id) REFERENCES tags(id),
    FOREIGN KEY(metadata_remote_id) REFERENCES metadata(id)
  );
`;