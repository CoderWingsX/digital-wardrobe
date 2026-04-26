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
      ? Array.from(
          new Set(
            r.tags
              .split(',')
              .map((t: string) => t.trim())
              .filter((t: string) => t.length > 0),
          ),
        )
      : [],
    images: r.images
      ? r.images
          .split(',')
          .map((i: string) => i.trim())
          .filter((i: string) => i.length > 0)
      : [],
  };
}

/**
 * Loads a single item from the database with all related data.
 */
export async function loadItem(id: number): Promise<WardrobeItem | null> {
  const database = await getDB();
  const row = await database.getFirstAsync(`SELECT * FROM items_full WHERE id = ?`, [id]);

  if (!row) return null;
  return parseItemRow(row);
}

/**
 * Loads all items from the database with their related data.
 */
export async function loadItems(): Promise<WardrobeItem[]> {
  const database = await getDB();
  const rows = await database.getAllAsync(`SELECT * FROM items_full`);

  if (!Array.isArray(rows)) {
    dbLog('No rows, returning empty array');
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

    await database.withTransactionAsync(async () => {
      // 1. Insert item
      const result = await database.runAsync(
        `INSERT INTO items (name, description, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [data.name, data.description, data.category, now, now],
      );
      itemId = result.lastInsertRowId;

      // 2. Insert metadata
      if (data.metadata && Object.keys(data.metadata).length > 0) {
        const metaJSON = JSON.stringify(data.metadata);
        await database.runAsync(
          `INSERT INTO metadata (item_id, attributes, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
          [itemId, metaJSON, now, now],
        );
      }

      // 3. Insert tags (normalize & case-insensitive lookup to avoid duplicates)
      if (data.tags && data.tags.length > 0) {
        const seen = new Set<string>();
        for (const rawTag of data.tags) {
          const tag = (rawTag || '').trim();
          if (!tag) continue;
          const lower = tag.toLowerCase();
          if (seen.has(lower)) continue;
          seen.add(lower);

          const existingRows = (await database.getAllAsync(
            `SELECT id FROM tags WHERE name = ? COLLATE NOCASE AND deleted = 0`,
            [tag],
          )) as { id: number }[];

          let tagId: number;
          if (existingRows.length > 0) {
            tagId = existingRows[0].id;
          } else {
            const tagRes = await database.runAsync(
              `INSERT INTO tags (name, created_at, updated_at)
               VALUES (?, ?, ?)`,
              [tag, now, now],
            );
            tagId = tagRes.lastInsertRowId;
          }

          await database.runAsync(
            `INSERT OR IGNORE INTO item_tags (item_id, tag_id, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [itemId, tagId, now, now],
          );
        }
      }

      // 4. Insert images
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const uri = data.images[i];
          await database.runAsync(
            `INSERT INTO item_images (item_id, local_uri, is_primary, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [itemId, uri, i === 0 ? 1 : 0, now, now],
          );
        }
      }
    });

    const newItem = await loadItem(itemId);
    if (!newItem) throw new Error('Failed to retrieve new item after insert');

    dbLog('addItem: inserted', { itemId, name: data.name });
    dbEvents.emit('itemsChanged', { type: 'add', id: itemId });

    return newItem;
  } catch (err) {
    dbError('Error adding item:', err, { payload: data });
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
 * Marks an item and its related data as deleted (soft delete).
 * Returns the ID of the deleted item.
 */
export async function deleteItem(itemId: number): Promise<number> {
  const database = await getDB();
  const now = Date.now();

  try {
    await database.withTransactionAsync(async () => {
      await database.runAsync(`UPDATE items SET deleted = 1, updated_at = ? WHERE id = ?`, [
        now,
        itemId,
      ]);
      await database.runAsync(`UPDATE metadata SET deleted = 1, updated_at = ? WHERE item_id = ?`, [
        now,
        itemId,
      ]);
      await database.runAsync(
        `UPDATE item_tags SET deleted = 1, updated_at = ? WHERE item_id = ?`,
        [now, itemId],
      );
      await database.runAsync(
        `UPDATE item_images SET deleted = 1, updated_at = ? WHERE item_id = ?`,
        [now, itemId],
      );
    });

    dbLog('deleteItem: marked deleted', { itemId });
    dbEvents.emit('itemsChanged', { type: 'delete', id: itemId });
    return itemId;
  } catch (err) {
    dbError('Error deleting item:', err);
    throw err;
  }
}

/**
 * Updates an item and returns the updated canonical item.
 */
export async function updateItem(itemId: number, data: UpdateItemData): Promise<WardrobeItem> {
  const database = await getDB();
  const now = Date.now();

  try {
    await database.withTransactionAsync(async () => {
      // 1. Update main item
      await database.runAsync(
        `UPDATE items SET name = ?, description = ?, category = ?, updated_at = ? WHERE id = ?`,
        [data.name, data.description, data.category, now, itemId],
      );

      // 2. Update metadata (Upsert logic)
      const metadataStr = JSON.stringify(data.metadata);
      const existingMeta = (await database.getAllAsync(
        `SELECT id FROM metadata WHERE item_id = ?`,
        [itemId],
      )) as { id: number }[];

      if (existingMeta.length > 0) {
        await database.runAsync(
          `UPDATE metadata SET attributes = ?, updated_at = ?, deleted = 0 WHERE id = ?`,
          [metadataStr, now, existingMeta[0].id],
        );
      } else {
        await database.runAsync(
          `INSERT INTO metadata (item_id, attributes, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
          [itemId, metadataStr, now, now],
        );
      }

      // 3. Update tags (normalize, dedupe, case-insensitive)
      const incomingTags = Array.isArray(data.tags)
        ? Array.from(
            new Set(
              data.tags.map((t: string) => (t || '').trim()).filter((t: string) => t.length > 0),
            ),
          )
        : [];

      const existingTagRows = (await database.getAllAsync(
        `SELECT it.id, it.tag_id, t.name as tag_name
         FROM item_tags it
         JOIN tags t ON t.id = it.tag_id
         WHERE it.item_id = ? AND it.deleted = 0`,
        [itemId],
      )) as { id: number; tag_id: number; tag_name: string }[];

      const incomingLowerSet = new Set(incomingTags.map((t: string) => t.toLowerCase()));
      const existingTagIds = new Set(existingTagRows.map((r) => r.tag_id));

      for (const tag of incomingTags) {
        // Find or create tag
        const existingTags = (await database.getAllAsync(
          `SELECT id FROM tags WHERE name = ? COLLATE NOCASE AND deleted = 0`,
          [tag],
        )) as { id: number }[];

        let tagId: number;
        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          const tagRes = await database.runAsync(
            `INSERT INTO tags (name, created_at, updated_at) VALUES (?, ?, ?)`,
            [tag, now, now],
          );
          tagId = tagRes.lastInsertRowId;
        }

        // Link tag to item if not already linked
        if (!existingTagIds.has(tagId)) {
          await database.runAsync(
            `INSERT OR IGNORE INTO item_tags (item_id, tag_id, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [itemId, tagId, now, now],
          );
        }
      }

      // Soft-delete removed tags
      const removedTagLinkIds = existingTagRows
        .filter((r) => !incomingLowerSet.has(r.tag_name.toLowerCase()))
        .map((r) => r.id);

      if (removedTagLinkIds.length > 0) {
        await database.runAsync(
          `UPDATE item_tags SET deleted = 1, updated_at = ? WHERE id IN (${removedTagLinkIds.join(',')})`,
          [now],
        );
      }

      // 4. Update images (Upsert/Soft Delete)
      const incomingImages = Array.isArray(data.images)
        ? data.images.filter((i) => i.trim().length > 0)
        : [];
      const incomingImgSet = new Set(incomingImages);

      const existingImageRows = (await database.getAllAsync(
        `SELECT id, local_uri FROM item_images WHERE item_id = ? AND deleted = 0`,
        [itemId],
      )) as { id: number; local_uri: string }[];

      // Add new images
      for (const uri of incomingImages) {
        const exists = existingImageRows.find((r) => r.local_uri === uri);
        if (!exists) {
          await database.runAsync(
            `INSERT INTO item_images (item_id, local_uri, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [itemId, uri, now, now],
          );
        }
      }

      // Soft-delete removed images
      const removedImageIds = existingImageRows
        .filter((r) => !incomingImgSet.has(r.local_uri))
        .map((r) => r.id);

      if (removedImageIds.length > 0) {
        await database.runAsync(
          `UPDATE item_images SET deleted = 1, updated_at = ? WHERE id IN (${removedImageIds.join(',')})`,
          [now],
        );
      }
    });

    const updatedItem = await loadItem(itemId);
    if (!updatedItem) throw new Error('Failed to retrieve item after update');

    dbLog('updateItem: updated', { itemId });
    dbEvents.emit('itemsChanged', { type: 'update', id: itemId });

    return updatedItem;
  } catch (err) {
    dbError(`Error updating item ${itemId}:`, err);
    throw err;
  }
}
