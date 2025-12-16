// src/database/queries.ts

import { getDB, dbEvents } from './index';
import { WardrobeItem, UpdateItemData, NewItemData } from '../types';
import { dbLog, dbError } from '../lib/logger';

/**
 * Helper to parse a single row from the items_full view.
 */
function parseItemRow(r: any): WardrobeItem {
  return {
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : {},
    tags: r.tags
      ? Array.from(new Set(r.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)))
      : [],
    images: r.images ? r.images.split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 0) : [],
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
    `SELECT 
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
    ORDER BY i.updated_at DESC`
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

      // 3. Insert tags (normalize & case-insensitive lookup to avoid duplicate tag rows)
      if (data.tags && data.tags.length > 0) {
        const seen = new Set<string>();
        for (let rawTag of data.tags) {
          const tag = (rawTag || '').trim();
          if (!tag) continue;
          const lower = tag.toLowerCase();
          if (seen.has(lower)) continue; // dedupe incoming for this insert
          seen.add(lower);

          const existingRows = (await database.getAllAsync(
            `SELECT id FROM tags WHERE LOWER(name) = LOWER(?) AND deleted = 0`,
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

    // After transaction, load and return the new item
    const newItem = await loadItem(itemId);
    if (!newItem) throw new Error('Failed to retrieve new item after insert');

    dbLog('addItem: inserted', { itemId, name: data.name });
    try {
      dbEvents.emit('itemsChanged', { type: 'add', id: itemId });
    } catch {}

    return newItem;
  } catch (err) {
    dbError('[db] Error adding item:', err, { payload: data });
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
    dbLog('All tables cleared.');
    try {
      dbEvents.emit('itemsChanged', { type: 'clearAll' });
    } catch {}
  } catch (err) {
    dbError('[db] Error clearing DB:', err);
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
         WHERE item_remote_id = ?`,
        [now, itemId]
      );
    });
    dbLog('deleteItem: marked deleted', { itemId });
    try {
      dbEvents.emit('itemsChanged', { type: 'delete', id: itemId });
    } catch {}
    return itemId;
  } catch (err) {
    dbError('[db] Error deleting item:', err);
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

      // 3. Update tags (normalize incoming tags, dedupe, case-insensitive lookup)
      const incomingTags = Array.isArray(data.tags)
        ? Array.from(
            new Set(
              data.tags
                .map((t: string) => (t || '').trim())
                .filter((t: string) => t.length > 0)
            )
          )
        : [];

      const existingTagRows = (await database.getAllAsync(
        `SELECT it.id, it.tag_remote_id, t.name as tag_name, LOWER(t.name) as tag_name_lower
         FROM item_tags it
         JOIN tags t ON t.id = it.tag_remote_id
         WHERE it.item_remote_id = ? AND it.deleted = 0`,
        [itemId]
      )) as { id: number; tag_remote_id: number; tag_name: string; tag_name_lower: string }[];

      const newTagIds: number[] = [];

      const incomingLowerSet = new Set(incomingTags.map((t: string) => t.toLowerCase()));

      for (const tag of incomingTags) {
        let tagId: number;

        // Case-insensitive search for existing tag to avoid duplicates
        const existingTags = (await database.getAllAsync(
          `SELECT id FROM tags WHERE LOWER(name) = LOWER(?) AND deleted = 0`,
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

        // Check if this tag is already linked to the item (by tag_remote_id)
        const existingTagLink = existingTagRows.find((r) => r.tag_remote_id === tagId);

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

      // Soft-delete tags that were removed: compare by tag name (case-insensitive)
      const removedTagIds = existingTagRows
        .filter((r) => !incomingLowerSet.has((r.tag_name_lower || '').toLowerCase()))
        .map((r) => r.id);

      if (removedTagIds.length > 0) {
        await database.runAsync(
          `UPDATE item_tags
           SET deleted = 1, pending_sync = 1, updated_at = ?
           WHERE id IN (${removedTagIds.join(',')})`,
          [now]
        );
      }

      // Debugging/logging: show what changed
      try {
        dbLog('updateItem tags debug', { itemId, incomingTags, existingTagRows, newTagIds, removedTagIds });
      } catch {}
    });

    // After transaction, load and return the updated item
    const updatedItem = await loadItem(itemId);
    if (!updatedItem) throw new Error('Failed to retrieve item after update');

    // Debug: log the canonical updated item so we can verify tags/meta in the DB
    try {
      dbLog('updateItem: updated', { itemId });
      dbLog('updateItem: canonicalItem', updatedItem);
    } catch {}
    
    // Extra debug: dump all item_tags rows for this item and the associated tags rows
    try {
      const itemTagRows = await database.getAllAsync(
        `SELECT * FROM item_tags WHERE item_remote_id = ? ORDER BY id`,
        [itemId]
      );
      dbLog('updateItem: item_tag rows (all)', itemTagRows);

      // Collect tag ids referenced by these rows
      const tagIds = Array.from(new Set((itemTagRows || []).map((r: any) => r.tag_remote_id))).filter(Boolean);
      if (tagIds.length > 0) {
        const tagsRows = await database.getAllAsync(
          `SELECT * FROM tags WHERE id IN (${tagIds.join(',')}) ORDER BY id`
        );
        dbLog('updateItem: tags rows for item', tagsRows);
      }
    } catch (e) {
      dbError('updateItem: debug dump failed', e);
    }
    try {
      dbEvents.emit('itemsChanged', { type: 'update', id: itemId });
    } catch {}

    return updatedItem;
  } catch (err) {
    dbError(`[db] Error updating item ${itemId}:`, err);
    throw err;
  }
}
