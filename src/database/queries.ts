// src/database/queries.tx

import { getDB } from './index';
import { WardrobeItem, UpdateItemData, NewItemData } from '../types';

/**
 * Loads all items from the database with their related data.
 */
export async function loadItems(): Promise<WardrobeItem[]> {
  const database = await getDB();
  const rows = await database.getAllAsync(`
    SELECT 
      i.id, i.name, i.category, i.description, i.created_at, i.updated_at,
      m.attributes AS metadata,
      GROUP_CONCAT(DISTINCT t.name) AS tags,
      GROUP_CONCAT(DISTINCT ii.image_path) AS images
    FROM items i
    LEFT JOIN metadata m 
      ON m.item_remote_id = i.id AND m.deleted = 0
    LEFT JOIN item_tags it 
      ON it.item_remote_id = i.id AND it.deleted = 0
    LEFT JOIN tags t 
      ON t.id = it.tag_remote_id AND t.deleted = 0
    LEFT JOIN item_images ii 
      ON ii.item_remote_id = i.id AND ii.deleted = 0
    WHERE i.deleted = 0
    GROUP BY i.id
    ORDER BY i.id DESC
  `);

  if (!Array.isArray(rows)) {
    console.log('[db] No rows, returning empty array');
    return [];
  }

  return rows.map((r: any) => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : {},
    tags: r.tags ? r.tags.split(',') : [],
    images: r.images ? r.images.split(',') : [],
  }));
}

/**
 * Adds a new item and its related data in a transaction.
 */
export async function addItem(data: NewItemData) {
  const database = await getDB();
  const now = Date.now();

  try {
    let itemId: number;
    let metaId: number | null = null;

    // Use a transaction for safety
    await database.withTransactionAsync(async () => {
      // 1. Insert item
      const result = await database.runAsync(
        `INSERT INTO items (name, description, category, created_at, updated_at, pending_sync)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [data.name, data.description, data.category, now, now]
      );
      itemId = result.lastInsertRowId;

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
      if (data.tags) {
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
            `INSERT INTO item_tags (item_remote_id, tag_remote_id)
             VALUES (?, ?)`,
            [itemId, tagId]
          );
        }
      }
    });
  } catch (err) {
    console.error('[db] Error adding item:', err);
    throw err; // Re-throw to be handled by the UI
  }
}

/**
 * Clears all data from all tables.
 */
export async function clearAll() {
  const database = await getDB();
  try {
    /* await database.runAsync(`PRAGMA foreign_keys = OFF`);
    await database.runAsync(`DROP TABLE IF EXISTS item_images`);
    await database.runAsync(`DROP TABLE item_tags`);
    await database.runAsync(`DROP TABLE metadata`);
    await database.runAsync(`DROP TABLE tags`);
    await database.runAsync(`DROP TABLE items`);
    await database.runAsync(`PRAGMA foreign_keys = ON`); */

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
  }
}

/**
 * Marks an item and its related data as deleted.
 */
export async function deleteItem(itemId: number) {
  const database = await getDB();
  const now = Date.now();

  try {
    // Use a transaction
    await database.withTransactionAsync(async () => {
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
         WHERE item_remote_id = ?`,
        [now, itemId]
      );
    });
  } catch (err) {
    console.error('[db] Error deleting item:', err);
  }
}

/**
 * Updates an item and its related data.
 */
export async function updateItem(itemId: number, data: UpdateItemData) {
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

      // 3. Update tags (soft-delete removed, insert new)
      const existingTagRows = (await database.getAllAsync(
        `SELECT id, tag_remote_id FROM item_tags WHERE item_remote_id = ? AND deleted = 0`,
        [itemId]
      )) as { id: number; tag_remote_id: number }[];

      const newTagIds: number[] = [];

      for (const tag of data.tags) {
        // Check if tag already exists in item_tags
        let tagId: number;

        // Look for the tag in the global tags table
        const existingTags = (await database.getAllAsync(
          `SELECT id FROM tags WHERE name = ?`,
          [tag]
        )) as { id: number }[];

        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          const tagRes = await database.runAsync(
            `INSERT INTO tags (name, created_at, updated_at, pending_sync)
            VALUES (?, ?, ?, 1)`,
            [tag, now, now]
          );
          tagId = tagRes.lastInsertRowId;
        }

        // Check if this tag is already linked to the item
        const existingTagLink = existingTagRows.find(r => r.tag_remote_id === tagId);

        if (existingTagLink) {
          newTagIds.push(existingTagLink.id); // Keep existing link
        } else {
          const linkRes = await database.runAsync(
            `INSERT INTO item_tags (item_remote_id, tag_remote_id, pending_sync, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?)`,
            [itemId, tagId, now, now]
          );
          newTagIds.push(linkRes.lastInsertRowId);
        }
      }

      // Soft-delete tags that were removed
      const removedTagIds = existingTagRows
        .filter(r => !newTagIds.includes(r.id))
        .map(r => r.id);

      if (removedTagIds.length > 0) {
        await database.runAsync(
          `UPDATE item_tags
          SET deleted = 1, pending_sync = 1, updated_at = ?
          WHERE id IN (${removedTagIds.join(',')})`,
          [now]
        );
      }

    });
    console.log(`[db] Item ${itemId} updated successfully.`);
  } catch (err) {
    console.error(`[db] Error updating item ${itemId}:`, err);
    throw err; // Re-throw to be handled by the UI
  }
}
