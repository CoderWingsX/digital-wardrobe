// src/database/maintenance.ts

import * as FileSystem from 'expo-file-system/legacy';
import { getDB } from './index';
import { dbLog, dbError } from '../lib/logger';

const IMAGES_DIR = FileSystem.documentDirectory + 'images/';

/**
 * Remove orphaned images from filesystem that are not referenced in DB.
 */
export async function cleanupOrphanedImages(): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  try {
    const db = await getDB();

    // Get all image URIs from database
    const dbImages = await db.getAllAsync<{ local_uri: string }>(
      `SELECT local_uri FROM item_images WHERE deleted = 0`,
    );
    const dbImageSet = new Set(dbImages.map((r) => r.local_uri));

    // Get all files in images directory
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) {
      dbLog('Images directory does not exist, nothing to clean');
      return { deleted, errors };
    }

    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);

    for (const filename of files) {
      if (!dbImageSet.has(filename)) {
        try {
          await FileSystem.deleteAsync(IMAGES_DIR + filename);
          deleted.push(filename);
          dbLog(`Deleted orphaned image: ${filename}`);
        } catch (err) {
          errors.push(filename);
          dbError(`Failed to delete orphaned image ${filename}:`, err);
        }
      }
    }

    dbLog(`Cleanup complete: ${deleted.length} deleted, ${errors.length} errors`);
  } catch (err) {
    dbError('cleanupOrphanedImages failed:', err);
    throw err;
  }

  return { deleted, errors };
}

/**
 * Remove orphaned records (metadata, tags, item_tags with no parent).
 */
export async function cleanupOrphanedRecords(): Promise<{
  metadata: number;
  itemTags: number;
  tags: number;
}> {
  const db = await getDB();
  let metadata = 0;
  let itemTags = 0;
  let tags = 0;

  try {
    // Delete metadata with no valid item
    const metaResult = await db.runAsync(`
      DELETE FROM metadata WHERE item_id NOT IN (SELECT id FROM items)
    `);
    metadata = metaResult.changes;

    // Delete item_tags with no valid item
    const itemTagResult = await db.runAsync(`
      DELETE FROM item_tags WHERE item_id NOT IN (SELECT id FROM items)
    `);
    itemTags = itemTagResult.changes;

    // Delete item_tags with no valid tag
    const itemTagResult2 = await db.runAsync(`
      DELETE FROM item_tags WHERE tag_id NOT IN (SELECT id FROM tags)
    `);
    itemTags += itemTagResult2.changes;

    // Delete soft-deleted tags that are not used by any item
    const tagResult = await db.runAsync(`
      DELETE FROM tags 
      WHERE deleted = 1 
      AND id NOT IN (SELECT DISTINCT tag_id FROM item_tags WHERE deleted = 0)
    `);
    tags = tagResult.changes;

    dbLog(`Orphan cleanup: ${metadata} metadata, ${itemTags} item_tags, ${tags} tags removed`);
  } catch (err) {
    dbError('cleanupOrphanedRecords failed:', err);
    throw err;
  }

  return { metadata, itemTags, tags };
}

/**
 * Permanently delete soft-deleted records and reclaim space.
 */
export async function vacuumDatabase(): Promise<{
  items: number;
  metadata: number;
  images: number;
  itemTags: number;
  tags: number;
}> {
  const db = await getDB();
  const result = { items: 0, metadata: 0, images: 0, itemTags: 0, tags: 0 };

  try {
    // First, clean up images from filesystem for deleted items
    const deletedImages = await db.getAllAsync<{ local_uri: string }>(
      `SELECT local_uri FROM item_images WHERE deleted = 1`,
    );

    for (const img of deletedImages) {
      try {
        const uri = img.local_uri.includes('/') ? img.local_uri : IMAGES_DIR + img.local_uri;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri);
        }
      } catch {
        // Ignore file deletion errors
      }
    }

    // Delete soft-deleted records permanently
    const itemsResult = await db.runAsync(`DELETE FROM items WHERE deleted = 1`);
    result.items = itemsResult.changes;

    const metaResult = await db.runAsync(`DELETE FROM metadata WHERE deleted = 1`);
    result.metadata = metaResult.changes;

    const imgResult = await db.runAsync(`DELETE FROM item_images WHERE deleted = 1`);
    result.images = imgResult.changes;

    const itemTagsResult = await db.runAsync(`DELETE FROM item_tags WHERE deleted = 1`);
    result.itemTags = itemTagsResult.changes;

    const tagsResult = await db.runAsync(`DELETE FROM tags WHERE deleted = 1`);
    result.tags = tagsResult.changes;

    // Run VACUUM to reclaim space
    await db.execAsync(`VACUUM`);

    dbLog('Vacuum complete:', result);
  } catch (err) {
    dbError('vacuumDatabase failed:', err);
    throw err;
  }

  return result;
}

/**
 * Check database integrity and foreign key consistency.
 */
export async function validateDatabaseIntegrity(): Promise<{
  ok: boolean;
  integrityCheck: string;
  foreignKeyErrors: number;
  issues: string[];
}> {
  const db = await getDB();
  const issues: string[] = [];

  try {
    // SQLite integrity check
    const integrityResult = await db.getFirstAsync<{ integrity_check: string }>(
      `SELECT integrity_check FROM pragma_integrity_check`,
    );
    const integrityCheck = integrityResult?.integrity_check ?? 'unknown';

    if (integrityCheck !== 'ok') {
      issues.push(`Integrity check failed: ${integrityCheck}`);
    }

    // Foreign key check
    const fkErrors = await db.getAllAsync<{
      table: string;
      rowid: number;
      parent: string;
      fkid: number;
    }>(`PRAGMA foreign_key_check`);

    if (fkErrors.length > 0) {
      issues.push(`Found ${fkErrors.length} foreign key violation(s)`);
      for (const err of fkErrors.slice(0, 5)) {
        issues.push(`  - ${err.table} row ${err.rowid} -> ${err.parent}`);
      }
    }

    // Check for orphaned metadata
    const orphanedMeta = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM metadata WHERE item_id NOT IN (SELECT id FROM items)`,
    );
    if (orphanedMeta && orphanedMeta.count > 0) {
      issues.push(`${orphanedMeta.count} orphaned metadata record(s)`);
    }

    // Check for orphaned item_images
    const orphanedImages = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM item_images WHERE item_id NOT IN (SELECT id FROM items)`,
    );
    if (orphanedImages && orphanedImages.count > 0) {
      issues.push(`${orphanedImages.count} orphaned image record(s)`);
    }

    const ok = issues.length === 0;
    dbLog('Integrity check:', ok ? 'OK' : issues);

    return {
      ok,
      integrityCheck,
      foreignKeyErrors: fkErrors.length,
      issues,
    };
  } catch (err) {
    dbError('validateDatabaseIntegrity failed:', err);
    throw err;
  }
}

/**
 * Export all data as JSON for backup purposes.
 */
export async function exportData(): Promise<{
  version: number;
  exportedAt: number;
  items: any[];
  metadata: any[];
  images: any[];
  tags: any[];
  itemTags: any[];
}> {
  const db = await getDB();

  try {
    const version = await db.getFirstAsync<{ version: number }>(
      `SELECT MAX(version) as version FROM schema_info`,
    );

    const items = await db.getAllAsync(`SELECT * FROM items WHERE deleted = 0`);
    const metadata = await db.getAllAsync(`SELECT * FROM metadata WHERE deleted = 0`);
    const images = await db.getAllAsync(`SELECT * FROM item_images WHERE deleted = 0`);
    const tags = await db.getAllAsync(`SELECT * FROM tags WHERE deleted = 0`);
    const itemTags = await db.getAllAsync(`SELECT * FROM item_tags WHERE deleted = 0`);

    return {
      version: version?.version ?? 1,
      exportedAt: Date.now(),
      items,
      metadata,
      images,
      tags,
      itemTags,
    };
  } catch (err) {
    dbError('exportData failed:', err);
    throw err;
  }
}

/**
 * Get database statistics.
 */
export async function getDatabaseStats(): Promise<{
  itemCount: number;
  tagCount: number;
  imageCount: number;
  deletedItemCount: number;
  categories: string[];
}> {
  const db = await getDB();

  try {
    const itemCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM items WHERE deleted = 0`,
    );
    const tagCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM tags WHERE deleted = 0`,
    );
    const imageCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM item_images WHERE deleted = 0`,
    );
    const deletedItemCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM items WHERE deleted = 1`,
    );
    const categoriesResult = await db.getAllAsync<{ category: string }>(
      `SELECT DISTINCT category FROM items WHERE deleted = 0 AND category IS NOT NULL AND category != ''`,
    );

    return {
      itemCount: itemCount?.count ?? 0,
      tagCount: tagCount?.count ?? 0,
      imageCount: imageCount?.count ?? 0,
      deletedItemCount: deletedItemCount?.count ?? 0,
      categories: categoriesResult.map((r) => r.category),
    };
  } catch (err) {
    dbError('getDatabaseStats failed:', err);
    throw err;
  }
}

/**
 * Get all unique categories for autocomplete.
 */
export async function getCategories(): Promise<string[]> {
  const db = await getDB();

  try {
    const result = await db.getAllAsync<{ category: string }>(
      `SELECT DISTINCT category FROM items 
       WHERE deleted = 0 AND category IS NOT NULL AND category != ''
       ORDER BY category ASC`,
    );
    return result.map((r) => r.category);
  } catch (err) {
    dbError('getCategories failed:', err);
    return [];
  }
}

/**
 * Get all unique tags for autocomplete.
 */
export async function getAllTags(): Promise<string[]> {
  const db = await getDB();

  try {
    const result = await db.getAllAsync<{ name: string }>(
      `SELECT DISTINCT name FROM tags WHERE deleted = 0 ORDER BY name ASC`,
    );
    return result.map((r) => r.name);
  } catch (err) {
    dbError('getAllTags failed:', err);
    return [];
  }
}
