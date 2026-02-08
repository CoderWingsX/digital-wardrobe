// src/database/schema.ts

/**
 * Clean offline-first schema for the digital wardrobe app.
 * This file is kept for reference - actual schema is managed by migrations.ts
 * 
 * Schema version: 1
 */

/**
 * @deprecated Use migrations.ts for schema creation.
 * This is kept only for documentation purposes.
 */
export const SCHEMA_REFERENCE = `
  -- Schema managed by migrations.ts
  -- See migrations.ts for the actual schema creation logic
  
  PRAGMA foreign_keys = ON;

  -- Core items table
  CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER DEFAULT 0
  );

  -- Item metadata (flexible key-value attributes)
  CREATE TABLE metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    attributes TEXT,  -- JSON string
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  -- Item images with local file references
  CREATE TABLE item_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    local_uri TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  -- Tags (unique names, case-insensitive)
  CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER DEFAULT 0
  );

  -- Many-to-many relationship between items and tags
  CREATE TABLE item_tags (
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

  -- Schema version tracking
  CREATE TABLE schema_info (
    version INTEGER PRIMARY KEY
  );

  -- Performance indexes
  CREATE INDEX idx_items_deleted ON items(deleted);
  CREATE INDEX idx_items_category ON items(category);
  CREATE INDEX idx_items_updated_at ON items(updated_at);
  CREATE INDEX idx_metadata_item_id ON metadata(item_id);
  CREATE INDEX idx_item_tags_item_id ON item_tags(item_id);
  CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);
  CREATE INDEX idx_item_images_item_id ON item_images(item_id);
  CREATE INDEX idx_tags_name ON tags(name);
`;
