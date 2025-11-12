// src/database/queries.ts

import { getDB } from './index';
import { WardrobeItem, UpdateItemData, NewItemData } from '../types';

/**
 * Helper to parse a single row from the items_full view.
 */
function parseItemRow(r: any): WardrobeItem {
  return {
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : {},
    tags: r.tags ? r.tags.split(',') : [],
    images: r.images ? r.images.split(',') : [],
  };
}

/**
 * Loads a single item from the database.
 */
export async function loadItem(id: number): Promise<WardrobeItem | null> {
  const database = await getDB();
  const row = await database.getFirstAsync(
    `SELECT * FROM items_full WHERE id = ?`,
    [id]
  );

  if (!row) return null;
  return parseItemRow(row);
}

/**
 * Loads all items from the database with their related data.
 */
export async function loadItems(): Promise<WardrobeItem[]> {
  const database = await getDB();
  // read from the view that centralizes join logic
  const rows = await database.getAllAsync(
    `SELECT * FROM items_full ORDER BY updated_at DESC` // Order by updated_at
  );

  if (!Array.isArray(rows)) {
    console.log('[db] No rows, returning empty array');
    return [];
  }

  return rows.map(parseItemRow);
}

/**
 * Adds a new item and returns the canonical item.
 */
export async function addItem(data: NewItemData): Promise<WardrobeItem> {
  const database = await getDB();
  const now = Date.now();

  try {
    let itemId = -1;

    // Use a transaction for safety
    await database.withTransactionAsync(async () => {
      // 1. Insert item
      const result = await database.runAsync(
        `INSERT INTO items (name, description, category, created_at, updated_at, pending_sync)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [data.name, data.description, data.category, now, now]
      );
      itemId = result.lastInsertRowId;

      let metaId: number | null = null;
      // 2. Insert metadata
      if (data.metadata && Object.keys(data.metadata).length > 0) {
        const metaJSON = JSON.stringify(data.metadata);
        const metaResult = await database.runAsync(
          `INSERT INTO metadata (item_remote_id, attributes, created_at, updated_at, pending_sync)
           VALUES (?, ?, ?, ?, 1)`,
          [itemId, metaJSON, now, now]
        );
        metaId = metaResult.lastInsertRowId;
      }

      // 3. Insert tags
      if (data.tags && data.tags.length > 0) {
        for (const tag of data.tags) {
          const existingRows = (await database.getAllAsync(
            `SELECT id FROM tags WHERE name = ?`,
            [tag]
          )) as { id: number }[];

          let tagId: number;
          if (existingRows.length > 0) {
            tagId = existingRows[0].id;
          } else {
            const tagRes = await database.runAsync(
              `INSERT INTO tags (name, created_at, updated_at, pending_sync)
               VALUES (?, ?, ?, 1)`,
              [tag, now, now]
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
    });

    // After transaction, load and return the new item
    const newItem = await loadItem(itemId);
    if (!newItem) throw new Error('Failed to retrieve new item after insert');
    return newItem;
  } catch (err) {
    console.error('[db] Error adding item:', err);
    throw err;
  }
}

/**
 * Clears all data from all tables.
 */
export async function clearAll() {
  const database = await getDB();
  try {
    await database.runAsync(`PRAGMA foreign_keys = OFF`);
    await database.runAsync(`DELETE FROM item_images`);
    await database.runAsync(`DELETE FROM item_tags`);
    await database.runAsync(`DELETE FROM metadata`);
    await database.runAsync(`DELETE FROM tags`);
    await database.runAsync(`DELETE FROM items`);
    await database.runAsync(`PRAGMA foreign_keys = ON`);
    console.log('[db] All tables cleared.');
  } catch (err) {
    console.error('[db] Error clearing DB:', err);
    throw err;
  }
}

/**
 * Marks an item and its related data as deleted.
 * Returns the ID of the deleted item.
 */
export async function deleteItem(itemId: number): Promise<number> {
  const database = await getDB();
  const now = Date.now();

  try {
    await database.withTransactionAsync(async () => {
      // ... (All the UPDATE deleted = 1 logic from your Version 1) ...
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
    });
    return itemId;
  } catch (err) {
    console.error('[db] Error deleting item:', err);
    throw err;
  }
}

/**
 * Updates an item and returns the updated canonical item.
 */
export async function updateItem(
  itemId: number,
  data: UpdateItemData
): Promise<WardrobeItem> {
  const database = await getDB();
  const now = Date.now();

  try {
    // Use a transaction
    await database.withTransactionAsync(async () => {
      // 1. Update main item
      await database.runAsync(
        `UPDATE items
         SET name = ?, description = ?, category = ?, updated_at = ?, pending_sync = 1
         WHERE id = ?`,
        [data.name, data.description, data.category, now, itemId]
      );

      // 2. Update metadata (Upsert logic)
      const metadataStr = JSON.stringify(data.metadata);
      const existingMeta = (await database.getAllAsync(
        `SELECT id FROM metadata WHERE item_remote_id = ?`,
        [itemId]
      )) as { id: number }[];

      let metaId: number;
      if (existingMeta.length > 0) {
        metaId = existingMeta[0].id;
        await database.runAsync(
          `UPDATE metadata
           SET attributes = ?, updated_at = ?, pending_sync = 1, deleted = 0
           WHERE id = ?`,
          [metadataStr, now, metaId]
        );
      } else {
        const metaRes = await database.runAsync(
          `INSERT INTO metadata (item_remote_id, attributes, created_at, updated_at, pending_sync)
           VALUES (?, ?, ?, ?, 1)`,
          [itemId, metadataStr, now, now]
        );
        metaId = metaRes.lastInsertRowId;
      }

      // 3. Update tags (Wipe and replace)
      await database.runAsync(
        `DELETE FROM item_tags WHERE item_remote_id = ?`,
        [itemId]
      );

      for (const tag of data.tags) {
        const existingTagRows = (await database.getAllAsync(
          `SELECT id FROM tags WHERE name = ?`,
          [tag]
        )) as { id: number }[];

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

        await database.runAsync(
          `INSERT INTO item_tags (item_remote_id, tag_remote_id, metadata_remote_id)
           VALUES (?, ?, ?)`,
          [itemId, tagId, metaId]
        );
      }
    });

    // After transaction, load and return the updated item
    const updatedItem = await loadItem(itemId);
    if (!updatedItem) throw new Error('Failed to retrieve item after update');
    return updatedItem;
  } catch (err) {
    console.error(`[db] Error updating item ${itemId}:`, err);
    throw err;
  }
} 
