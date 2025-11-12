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
    item_remote_id INTEGER,
    image_path TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    pending_sync INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(item_remote_id) REFERENCES items(id)
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
    item_remote_id INTEGER,
    tag_remote_id INTEGER,
    created_at INTEGER,
    updated_at INTEGER,
    pending_sync INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(item_remote_id) REFERENCES items(id),
    FOREIGN KEY(tag_remote_id) REFERENCES tags(id)
  );

  -- View that centralizes item joins for easy reads
  CREATE VIEW IF NOT EXISTS items_full AS
  SELECT i.id, i.name, i.category, i.description, i.created_at, i.updated_at,
         m.attributes AS metadata,
         GROUP_CONCAT(DISTINCT t.name) AS tags,
         GROUP_CONCAT(DISTINCT ii.image_path) AS images
  FROM items i
  LEFT JOIN metadata m ON m.item_remote_id = i.id
  LEFT JOIN item_tags it ON it.item_remote_id = i.id
  LEFT JOIN tags t ON t.id = it.tag_remote_id
  LEFT JOIN item_images ii ON ii.item_remote_id = i.id
  WHERE i.deleted = 0
  GROUP BY i.id;

  -- Indexes to speed up common reads and joins
  CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted);
  CREATE INDEX IF NOT EXISTS idx_metadata_item_remote_id ON metadata(item_remote_id);
  CREATE INDEX IF NOT EXISTS idx_item_tags_item_remote_id ON item_tags(item_remote_id);
  CREATE INDEX IF NOT EXISTS idx_item_tags_tag_remote_id ON item_tags(tag_remote_id);
  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
`;
