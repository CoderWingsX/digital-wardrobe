import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = FileSystem.documentDirectory + 'images/';

/**
 * Ensures the images directory exists.
 */
async function ensureDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    console.log('[fs] Creating images directory...');
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

/**
 * Copies an image from a temporary location (cache) to the permanent app storage.
 * Returns the new permanent local URI.
 */
export async function saveImageLocally(sourceUri: string): Promise<string> {
  try {
    await ensureDirExists();

    // Extract filename from source URI or generate a new one
    const filename = sourceUri.split('/').pop() || `img_${Date.now()}.jpg`;
    const newPath = IMAGES_DIR + filename;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: newPath,
    });

    // Return relative filename
    return filename;
  } catch (error) {
    console.error('[fs] Error saving image locally:', error);
    throw error;
  }
}

/**
 * Resolves a stored path to a displayable URI.
 * Handles:
 * 1. Simple filenames ("img_123.jpg") -> returns absolute path in current doc dir
 * 2. Old/Broken absolute paths ("file:///old-guid/images/img_123.jpg") -> extracts filename and returns new valid absolute path
 * 3. External/Temp URIs ("file:///.../cache/...") -> returns as is (for unsaved images)
 */
export function getLocalImageUri(path: string): string {
  if (!path) return '';

  // If it's already a http/https URL, return it
  if (path.startsWith('http')) return path;

  // Is it a simple filename? (No slashes)
  if (!path.includes('/')) {
    return IMAGES_DIR + path;
  }

  // It has slashes. Check if it's one of OUR images in the document directory.
  if (path.includes('/images/')) {
    const filename = path.split('/images/').pop();
    if (filename) {
      return IMAGES_DIR + filename;
    }
  }

  return path;
}

/**
 * Deletes an image from the permanent app storage.
 */
export async function deleteImageLocally(pathOrFilename: string): Promise<void> {
  try {
    const localUri = getLocalImageUri(pathOrFilename);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localUri);
    }
  } catch (error) {
    console.error('[fs] Error deleting image locally:', error);
    // We don't throw here to avoid blocking DB ops if file is already gone
  }
}
