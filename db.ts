import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase() {
  if (db) return db;

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
  `);

  console.log('Local SQLite DB initialized');
  return db;
}

// Get DB 
export function getDB() {
  if (!db) console.log("Uhmmmm....")
  if (!db) throw new Error('DB not initialized. Call initDatabase() first.');
  return db;
}

// Load items
export async function loadItems() {
  const database = getDB();
  const rows = await database.getAllAsync(`
    SELECT i.id, i.name, i.category, i.description,
           m.attributes AS metadata,
           GROUP_CONCAT(t.name, ',') AS tags,
           GROUP_CONCAT(ii.image_path, ',') AS images
    FROM items i
    LEFT JOIN metadata m ON m.item_remote_id = i.id
    LEFT JOIN item_tags it ON it.item_remote_id = i.id
    LEFT JOIN tags t ON t.id = it.tag_remote_id
    LEFT JOIN item_images ii ON ii.metadata_remote_id = m.id
    WHERE i.deleted = 0
    GROUP BY i.id
    ORDER BY i.id DESC
  `);

  if (!rows || !Array.isArray(rows)) {
    console.log("No rows, returning empty array");
    return [];
  }

  return rows.map((r: any) => {
    let metaObj = {};
    try {
      metaObj = r.metadata ? JSON.parse(r.metadata) : {};
    } catch {
      metaObj = {};
    }

    return {
      ...r,
      metadata: metaObj,
      tags: r.tags ? r.tags.split(',') : [],
      images: r.images ? r.images.split(',') : [],
    };
  });
}

// Add item
export async function addItem(data: {
  name: string;
  description: string;
  category: string;
  metadata?: string;
  tags?: string;
}) {
  const database = getDB();
  const now = Date.now();

  // Insert item
  const result = await database.runAsync(
    `INSERT INTO items (name, description, category, created_at, updated_at, pending_sync)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.name, data.description, data.category, now, now, 1]
  );

  const itemId = result.lastInsertRowId;

  // Insert metadata
  let metaId: number | null = null;
  if (data.metadata) {
    try {
      const metaJSON = JSON.stringify(
        Object.fromEntries(
          data.metadata.split(',')
            .map(pair => pair.split(':').map(s => s.trim()))
            .filter(([k, v]) => k && v)
        )
      );

      const metaResult = await database.runAsync(
        `INSERT INTO metadata (item_remote_id, attributes, created_at, updated_at, pending_sync)
         VALUES (?, ?, ?, ?, ?)`,
        [itemId, metaJSON, now, now, 1]
      );

      metaId = metaResult.lastInsertRowId;
    } catch (err) {
      console.error('Invalid metadata format', err);
    }
  }

  // Insert tags
  if (data.tags) {
    const tagList = data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    for (const tag of tagList) {
      const existingRows = await database.getAllAsync(
        `SELECT id FROM tags WHERE name = ?`,
        [tag]
      ) as { id: number }[];

      let tagId: number;
      if (existingRows.length > 0) {
        tagId = existingRows[0].id;
      } else {
        const tagRes = await database.runAsync(
          `INSERT INTO tags (name, created_at, updated_at, pending_sync)
           VALUES (?, ?, ?, ?)`,
          [tag, now, now, 1]
        );
        tagId = tagRes.lastInsertRowId;
      }

      await database.runAsync(
        `INSERT INTO item_tags (item_remote_id, tag_remote_id, metadata_remote_id)
         VALUES (?, ?, ?)`,
        [itemId, tagId, metaId]
      );
    }
  }
}

// Clear all tables
export async function clearAll() {
  const database = getDB();
  try {
    await database.runAsync(`PRAGMA foreign_keys = OFF`);

    await database.runAsync(`DELETE FROM item_images`);
    await database.runAsync(`DELETE FROM item_tags`);
    await database.runAsync(`DELETE FROM metadata`);
    await database.runAsync(`DELETE FROM tags`);
    await database.runAsync(`DELETE FROM items`);
    await database.runAsync(`PRAGMA foreign_keys = ON`);
    
    console.log("Init db after Clearing all")
  } catch (err) {
    console.error('Error clearing DB:', err);
  }
}

// Delete item
export async function deleteItem(itemId: number) {
  const database = getDB();
  const now = Date.now();

  try {
    await database.runAsync(
      `UPDATE items SET deleted = 1, pending_sync = 1, updated_at = ? WHERE id = ?`,
      [now, itemId]
    );

    await database.runAsync(
      `UPDATE metadata SET deleted = 1, pending_sync = 1, updated_at = ? WHERE item_remote_id = ?`,
      [now, itemId]
    );

    await database.runAsync(
      `UPDATE item_tags SET deleted = 1 WHERE item_remote_id = ?`,
      [itemId]
    );

    await database.runAsync(
      `UPDATE item_images SET deleted = 1, pending_sync = 1, updated_at = ? 
       WHERE metadata_remote_id IN (SELECT id FROM metadata WHERE item_remote_id = ?)`,
      [now, itemId]
    );
  } catch (err) {
    console.error('Error deleting item:', err);
  }
}

// Update item
export async function updateItem(itemId: number, data: {
  name: string;
  description: string;
  category: string;
  metadata?: Record<string, any>;
  tags?: string[];
}) {
  const database = getDB();
  const now = Date.now();

  try {
    // Update main item
    await database.runAsync(
      `UPDATE items
       SET name = ?, description = ?, category = ?, updated_at = ?, pending_sync = 1
       WHERE id = ?`,
      [data.name, data.description, data.category, now, itemId]
    );

    // Update metadata
    if (data.metadata) {
      const metadataStr = JSON.stringify(data.metadata);

      const existingMeta = await database.getAllAsync(
        `SELECT id FROM metadata WHERE item_remote_id = ?`,
        [itemId]
      ) as { id: number }[];

      if (existingMeta.length > 0) {
        await database.runAsync(
          `UPDATE metadata
           SET attributes = ?, updated_at = ?, pending_sync = 1, deleted = 0
           WHERE item_remote_id = ?`,
          [metadataStr, now, itemId]
        );
      } else {
        await database.runAsync(
          `INSERT INTO metadata (item_remote_id, attributes, created_at, updated_at, pending_sync)
           VALUES (?, ?, ?, ?, 1)`,
          [itemId, metadataStr, now, now]
        );
      }
    }

    // Update tags
    if (data.tags) {
      await database.runAsync(
        `DELETE FROM item_tags WHERE item_remote_id = ?`,
        [itemId]
      );

      for (const tag of data.tags) {
        const existingTagRows = await database.getAllAsync(
          `SELECT id FROM tags WHERE name = ?`,
          [tag]
        ) as { id: number }[];

        let tagId: number;
        if (existingTagRows.length > 0) {
          tagId = existingTagRows[0].id;
        } else {
          const tagRes = await database.runAsync(
            `INSERT INTO tags (name, created_at, updated_at, pending_sync)
             VALUES (?, ?, ?, 1)`,
            [tag, now, now]
          );
          tagId = tagRes.lastInsertRowId;
        }

        const metaRows = await database.getAllAsync(
          `SELECT id FROM metadata WHERE item_remote_id = ?`,
          [itemId]
        ) as { id: number }[];

        const metaId = metaRows.length > 0 ? metaRows[0].id : null;

        await database.runAsync(
          `INSERT INTO item_tags (item_remote_id, tag_remote_id, metadata_remote_id)
           VALUES (?, ?, ?)`,
          [itemId, tagId, metaId]
        );
      }
    }

    console.log(`Item ${itemId} updated successfully.`);
  } catch (err) {
    console.error(`Error updating item ${itemId}:`, err);
  }
}
