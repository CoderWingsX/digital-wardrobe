# Database Documentation

Complete reference for the SQLite database schema, migrations, and operations.

## Table of Contents

- [Overview](#overview)
- [Schema](#schema)
- [Indexes](#indexes)
- [Views](#views)
- [Migration Guide](#migration-guide)
- [Query Reference](#query-reference)
- [Maintenance Operations](#maintenance-operations)

---

## Overview

The app uses SQLite via `expo-sqlite` for local data storage. Key characteristics:

- **Offline-first** - No network required
- **Soft deletes** - Items marked deleted, not removed
- **Versioned migrations** - Schema changes via PRAGMA user_version
- **Foreign keys** - Referential integrity enforced

### Database File

Location: `wardrobe.db` in app's document directory

### Current Schema Version

**Version 3** (as of latest release)

---

## Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `items` | Main wardrobe items |
| `metadata` | Custom key-value data per item |
| `item_images` | Image file references |
| `tags` | Tag definitions |
| `item_tags` | Many-to-many item-tag links |

---

### items

Main table for wardrobe items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `name` | TEXT | NOT NULL | Item name |
| `description` | TEXT | | Item description |
| `category` | TEXT | | Category (e.g., "Tops") |
| `created_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `deleted` | INTEGER | DEFAULT 0 | Soft delete flag (0/1) |

```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER DEFAULT 0
);
```

---

### metadata

Stores custom key-value metadata as JSON per item.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `item_id` | INTEGER | NOT NULL, FK → items(id) | Parent item |
| `attributes` | TEXT | | JSON object of key-value pairs |
| `created_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `deleted` | INTEGER | DEFAULT 0 | Soft delete flag |

```sql
CREATE TABLE metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  attributes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER DEFAULT 0,
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

**Example attributes JSON:**
```json
{
  "brand": "Nike",
  "size": "M",
  "color": "Navy Blue",
  "material": "100% Cotton",
  "price": "49.99"
}
```

---

### item_images

References to locally stored image files.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `item_id` | INTEGER | NOT NULL, FK → items(id) | Parent item |
| `local_uri` | TEXT | NOT NULL | Filename or path |
| `is_primary` | INTEGER | DEFAULT 0 | Primary image flag |
| `created_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `deleted` | INTEGER | DEFAULT 0 | Soft delete flag |

```sql
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
```

---

### tags

Tag definitions (case-insensitive unique names).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `name` | TEXT | NOT NULL, UNIQUE COLLATE NOCASE | Tag name |
| `created_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `deleted` | INTEGER | DEFAULT 0 | Soft delete flag |

```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER DEFAULT 0
);
```

---

### item_tags

Many-to-many relationship between items and tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `item_id` | INTEGER | NOT NULL, FK → items(id) | Item reference |
| `tag_id` | INTEGER | NOT NULL, FK → tags(id) | Tag reference |
| `created_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp (ms) |
| `deleted` | INTEGER | DEFAULT 0 | Soft delete flag |

```sql
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
```

---

## Indexes

Performance indexes on frequently queried columns:

```sql
CREATE INDEX idx_items_deleted ON items(deleted);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_updated_at ON items(updated_at);
CREATE INDEX idx_metadata_item_id ON metadata(item_id);
CREATE INDEX idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);
CREATE INDEX idx_item_images_item_id ON item_images(item_id);
CREATE INDEX idx_tags_name ON tags(name);
```

---

## Views

### items_full

Aggregated view joining items with all related data.

```sql
CREATE VIEW items_full AS
SELECT 
  i.id, 
  i.name, 
  i.category, 
  i.description, 
  i.created_at, 
  i.updated_at,
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
```

**Output columns:**
- `id`, `name`, `category`, `description`, `created_at`, `updated_at`
- `metadata` - JSON string
- `tags` - Comma-separated tag names
- `images` - Comma-separated image URIs

---

## Migration Guide

### Overview

Migrations are defined in `src/database/migrations.ts` and run automatically on app startup.

- **Versioning**: Uses `PRAGMA user_version` (SQLite standard)
- **Direction**: Forward-only (no rollback)
- **Execution**: Sequential, version by version

### How to Add a New Migration

#### Step 1: Increment Version

```typescript
// src/database/migrations.ts
export const CURRENT_SCHEMA_VERSION = 4; // was 3
```

#### Step 2: Add Migration Object

```typescript
const MIGRATIONS: Migration[] = [
  // ... existing migrations
  {
    version: 4,
    description: 'Add color column to items',
    up: async (db: SQLite.SQLiteDatabase) => {
      await db.execAsync(`
        ALTER TABLE items ADD COLUMN color TEXT DEFAULT '';
      `);
    },
  },
];
```

#### Step 3: Update Fresh Schema (if applicable)

If the change affects new installs, update `createFreshSchema()`:

```typescript
async function createFreshSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE items (
      -- existing columns
      color TEXT DEFAULT ''  -- new column
    );
  `);
}
```

### Data Preservation Rules

| Change Type | Auto-Preserved? | Action Required |
|-------------|-----------------|-----------------|
| Add column | ✅ Yes | Just ALTER TABLE |
| Add index | ✅ Yes | Just CREATE INDEX |
| Add view | ✅ Yes | Just CREATE VIEW |
| Rename column | ❌ No | Manual copy |
| Change type | ❌ No | Manual copy |
| Delete column | ❌ No | Manual copy |
| Restructure | ❌ No | Manual copy |

### Manual Data Copy Example

For complex changes requiring data preservation:

```typescript
{
  version: 5,
  description: 'Rename old_column to new_column',
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      -- 1. Create new table
      CREATE TABLE items_new (
        id INTEGER PRIMARY KEY,
        name TEXT,
        new_column TEXT  -- renamed
      );
      
      -- 2. Copy data
      INSERT INTO items_new (id, name, new_column)
      SELECT id, name, old_column FROM items;
      
      -- 3. Drop old table
      DROP TABLE items;
      
      -- 4. Rename new table
      ALTER TABLE items_new RENAME TO items;
      
      -- 5. Recreate indexes
      CREATE INDEX idx_items_name ON items(name);
    `);
  },
}
```

### Migration Execution Flow

```
App Startup
    │
    ▼
initDatabase()
    │
    ▼
getCurrentVersion() ─── PRAGMA user_version
    │
    ▼
Compare with CURRENT_SCHEMA_VERSION
    │
    ├── Equal → Done (no migrations)
    │
    └── Less → Run migrations sequentially
              │
              ▼
         For each version > current:
              │
              ▼
         Execute migration.up()
              │
              ▼
         setVersion(newVersion)
              │
              ▼
         Continue to next version
```

---

## Query Reference

### Load Operations

```typescript
// Load single item
loadItem(id: number): Promise<WardrobeItem | null>

// Load all items
loadItems(): Promise<WardrobeItem[]>
```

### Write Operations

```typescript
// Add new item
addItem(data: NewItemData): Promise<WardrobeItem>

// Update existing item
updateItem(id: number, data: UpdateItemData): Promise<WardrobeItem>

// Soft delete item
deleteItem(id: number): Promise<number>

// Clear all data
clearAll(): Promise<void>
```

### Helper Queries

```typescript
// Get unique categories
getCategories(): Promise<string[]>

// Get all tags
getAllTags(): Promise<string[]>

// Get database statistics
getDatabaseStats(): Promise<{
  itemCount: number;
  tagCount: number;
  imageCount: number;
  deletedItemCount: number;
  categories: string[];
}>
```

---

## Maintenance Operations

### Cleanup Functions

```typescript
// Delete orphaned image files
cleanupOrphanedImages(): Promise<{
  deleted: string[];
  errors: string[];
}>

// Remove orphaned database records
cleanupOrphanedRecords(): Promise<{
  metadata: number;
  itemTags: number;
  tags: number;
}>
```

### Vacuum

Permanently removes soft-deleted records and reclaims space:

```typescript
vacuumDatabase(): Promise<{
  items: number;
  metadata: number;
  images: number;
  itemTags: number;
  tags: number;
}>
```

### Integrity Check

```typescript
validateDatabaseIntegrity(): Promise<{
  ok: boolean;
  integrityCheck: string;
  foreignKeyErrors: number;
  issues: string[];
}>
```

### Data Export

```typescript
exportData(): Promise<{
  version: number;
  exportedAt: number;
  items: any[];
  metadata: any[];
  images: any[];
  tags: any[];
  itemTags: any[];
}>
```

---

## Best Practices

1. **Always use transactions** for multi-table operations
2. **Check version** before assuming column exists
3. **Soft delete first**, vacuum periodically
4. **Test migrations** on copy of production data
5. **Backup before vacuum** - it's irreversible
