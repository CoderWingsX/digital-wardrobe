// src/data/testDataLoader.ts

import * as FileSystem from 'expo-file-system/legacy';
import { addItem, deleteItem, loadItems } from '../database/queries';
import testData from './testData.json';

const TEST_DATA_TAG = 'test-data';
const IMAGE_DIR = `${FileSystem.documentDirectory}wardrobe-images/`;

interface TestItem {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, string>;
  tags: string[];
  imageUrl: string;
}

/**
 * Downloads an image from URL and saves it locally
 */
async function downloadImage(url: string, filename: string): Promise<string | null> {
  try {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    const localPath = `${IMAGE_DIR}${filename}`;
    
    const downloadResult = await FileSystem.downloadAsync(url, localPath);
    if (downloadResult.status === 200) {
      return localPath;
    }
    console.warn(`Failed to download image: ${url}`);
    return null;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

/**
 * Shuffles array and returns first n items
 */
function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Loads test data into the database
 * @param count Number of items to load (defaults to half of available items)
 * @param downloadImages Whether to download images (set false for faster testing)
 */
export async function loadTestData(
  count?: number,
  downloadImages: boolean = true
): Promise<{ loaded: number; failed: number }> {
  const items = testData.items as TestItem[];
  const itemsToLoad = count ? getRandomItems(items, count) : getRandomItems(items, Math.ceil(items.length / 2));
  
  let loaded = 0;
  let failed = 0;

  for (const item of itemsToLoad) {
    try {
      let images: string[] = [];
      
      if (downloadImages && item.imageUrl) {
        const filename = `test_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const localPath = await downloadImage(item.imageUrl, filename);
        if (localPath) {
          images = [localPath];
        }
      }

      await addItem({
        name: item.name,
        description: item.description,
        category: item.category,
        metadata: { ...item.metadata, testData: 'true' },
        tags: item.tags,
        images,
      });
      
      loaded++;
    } catch (error) {
      console.error(`Failed to load item "${item.name}":`, error);
      failed++;
    }
  }

  return { loaded, failed };
}

/**
 * Removes all test data from the database
 */
export async function unloadTestData(): Promise<{ removed: number }> {
  const allItems = await loadItems();
  const testItems = allItems.filter(
    item => item.tags.includes(TEST_DATA_TAG) || item.metadata?.testData === 'true'
  );

  let removed = 0;

  for (const item of testItems) {
    try {
      // Delete associated images
      for (const imagePath of item.images || []) {
        try {
          const info = await FileSystem.getInfoAsync(imagePath);
          if (info.exists) {
            await FileSystem.deleteAsync(imagePath);
          }
        } catch (e) {
          console.warn('Failed to delete image:', imagePath);
        }
      }
      
      await deleteItem(item.id);
      removed++;
    } catch (error) {
      console.error(`Failed to remove item "${item.name}":`, error);
    }
  }

  return { removed };
}

/**
 * Checks how many test items are currently in the database
 */
export async function getTestDataCount(): Promise<number> {
  const allItems = await loadItems();
  return allItems.filter(
    item => item.tags.includes(TEST_DATA_TAG) || item.metadata?.testData === 'true'
  ).length;
}

/**
 * Gets available test data info
 */
export function getAvailableTestData(): { total: number; categories: string[] } {
  const items = testData.items as TestItem[];
  const categories = [...new Set(items.map(i => i.category))];
  return {
    total: items.length,
    categories,
  };
}
