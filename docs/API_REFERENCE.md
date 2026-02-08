# API Reference

Complete reference for all functions, hooks, and components.

## Table of Contents

- [Contexts](#contexts)
- [Database Functions](#database-functions)
- [Maintenance Functions](#maintenance-functions)
- [Filesystem Functions](#filesystem-functions)
- [Test Data Functions](#test-data-functions)
- [Components](#components)
- [Types](#types)

---

## Contexts

### useDatabase

Primary hook for database operations and state.

```typescript
import { useDatabase } from '../contexts/DatabaseContext';

const {
  // State
  dbReady,          // boolean - Database initialized
  dbError,          // Error | null - Initialization error
  loading,          // boolean - Loading items
  initializing,     // boolean - DB initializing
  migrationInfo,    // MigrationInfo | null
  schemaVersion,    // number - Current schema version
  items,            // WardrobeItem[] - All items
  categories,       // string[] - Unique categories
  allTags,          // string[] - All tag names
  
  // Methods
  refresh,          // () => Promise<void>
  refreshCategories,// () => Promise<void>
  refreshTags,      // () => Promise<void>
  addItemOptimistic,    // (data) => Promise<WardrobeItem>
  updateItemOptimistic, // (id, data) => Promise<WardrobeItem>
  deleteItemOptimistic, // (id) => Promise<void>
  clearAllOptimistic,   // () => Promise<void>
} = useDatabase();
```

#### addItemOptimistic

Add a new item with optimistic UI update.

```typescript
const newItem = await addItemOptimistic({
  name: 'Blue Jacket',
  description: 'Denim jacket',
  category: 'Outerwear',
  metadata: { brand: 'Levi\'s', size: 'M' },
  tags: ['casual', 'fall'],
  images: ['img_123.jpg'],
});
```

#### updateItemOptimistic

Update an existing item.

```typescript
const updated = await updateItemOptimistic(itemId, {
  name: 'Updated Name',
  description: 'New description',
  category: 'Tops',
  metadata: { brand: 'Nike' },
  tags: ['sporty'],
  images: ['img_456.jpg'],
});
```

#### deleteItemOptimistic

Soft delete an item.

```typescript
await deleteItemOptimistic(itemId);
```

#### clearAllOptimistic

Delete all items.

```typescript
await clearAllOptimistic();
```

---

### useTheme

Hook for theme state and colors.

```typescript
import { useTheme } from '../contexts/ThemeContext';

const {
  mode,     // 'light' | 'dark' | 'system'
  isDark,   // boolean - Current effective theme
  colors,   // ThemeColors - Color values
  setMode,  // (mode) => void
} = useTheme();
```

#### Color Tokens

```typescript
interface ThemeColors {
  background: string;      // Screen background
  surface: string;         // Card/section background
  card: string;            // Elevated card background
  text: string;            // Primary text
  textSecondary: string;   // Secondary text
  textMuted: string;       // Muted/hint text
  border: string;          // Border color
  primary: string;         // Primary accent (blue)
  danger: string;          // Destructive actions (red)
  success: string;         // Success state (green)
  inputBackground: string; // Input field background
  inputBorder: string;     // Input field border
  headerBackground: string;// Navigation header
  tabBar: string;          // Tab bar background
}
```

#### Light Colors

```typescript
{
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  primary: '#007AFF',
  danger: '#FF3B30',
  success: '#34C759',
  inputBackground: '#FFFFFF',
  inputBorder: '#CCCCCC',
  headerBackground: '#FFFFFF',
  tabBar: '#FFFFFF',
}
```

#### Dark Colors

```typescript
{
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#ABABAB',
  textMuted: '#666666',
  border: '#3A3A3C',
  primary: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  inputBackground: '#1C1C1E',
  inputBorder: '#3A3A3C',
  headerBackground: '#1C1C1E',
  tabBar: '#1C1C1E',
}
```

---

## Database Functions

Located in `src/database/queries.ts`

### loadItem

Load a single item by ID.

```typescript
function loadItem(id: number): Promise<WardrobeItem | null>
```

### loadItems

Load all non-deleted items.

```typescript
function loadItems(): Promise<WardrobeItem[]>
```

### addItem

Add a new item to database.

```typescript
function addItem(data: NewItemData): Promise<WardrobeItem>
```

### updateItem

Update an existing item.

```typescript
function updateItem(id: number, data: UpdateItemData): Promise<WardrobeItem>
```

### deleteItem

Soft delete an item (sets deleted = 1).

```typescript
function deleteItem(itemId: number): Promise<number>
```

### clearAll

Delete all data from all tables.

```typescript
function clearAll(): Promise<void>
```

---

## Maintenance Functions

Located in `src/database/maintenance.ts`

### cleanupOrphanedImages

Remove image files not referenced in database.

```typescript
function cleanupOrphanedImages(): Promise<{
  deleted: string[];  // Deleted filenames
  errors: string[];   // Failed deletions
}>
```

### cleanupOrphanedRecords

Remove orphaned database records.

```typescript
function cleanupOrphanedRecords(): Promise<{
  metadata: number;   // Metadata records removed
  itemTags: number;   // Item-tag links removed
  tags: number;       // Unused tags removed
}>
```

### vacuumDatabase

Permanently delete soft-deleted records and run VACUUM.

```typescript
function vacuumDatabase(): Promise<{
  items: number;
  metadata: number;
  images: number;
  itemTags: number;
  tags: number;
}>
```

### validateDatabaseIntegrity

Check database integrity and foreign keys.

```typescript
function validateDatabaseIntegrity(): Promise<{
  ok: boolean;
  integrityCheck: string;
  foreignKeyErrors: number;
  issues: string[];
}>
```

### exportData

Export all data as JSON.

```typescript
function exportData(): Promise<{
  version: number;
  exportedAt: number;
  items: any[];
  metadata: any[];
  images: any[];
  tags: any[];
  itemTags: any[];
}>
```

### getDatabaseStats

Get database statistics.

```typescript
function getDatabaseStats(): Promise<{
  itemCount: number;
  tagCount: number;
  imageCount: number;
  deletedItemCount: number;
  categories: string[];
}>
```

### getCategories

Get unique category names.

```typescript
function getCategories(): Promise<string[]>
```

### getAllTags

Get all tag names.

```typescript
function getAllTags(): Promise<string[]>
```

---

## Filesystem Functions

Located in `src/lib/filesystem.ts`

### saveImageLocally

Copy image to permanent storage.

```typescript
function saveImageLocally(sourceUri: string): Promise<string>
```

**Parameters:**
- `sourceUri` - Temporary URI from image picker

**Returns:** Filename in permanent storage

### getLocalImageUri

Resolve stored path to displayable URI.

```typescript
function getLocalImageUri(path: string): string
```

**Parameters:**
- `path` - Stored filename or path

**Returns:** Full file:// URI for Image component

### deleteImageLocally

Delete image file from storage.

```typescript
function deleteImageLocally(pathOrFilename: string): Promise<void>
```

---

## Test Data Functions

Located in `src/data/testDataLoader.ts`

### loadTestData

Load sample items into database.

```typescript
function loadTestData(
  count?: number,           // Items to load (default: half)
  downloadImages?: boolean  // Download images (default: true)
): Promise<{
  loaded: number;
  failed: number;
}>
```

### unloadTestData

Remove all test items.

```typescript
function unloadTestData(): Promise<{
  removed: number;
}>
```

### getTestDataCount

Count test items in database.

```typescript
function getTestDataCount(): Promise<number>
```

### getAvailableTestData

Get info about available test data.

```typescript
function getAvailableTestData(): {
  total: number;
  categories: string[];
}
```

---

## Components

### CustomDialog

Cross-platform dialog with vertical buttons.

```tsx
import CustomDialog from '../components/CustomDialog';

<CustomDialog
  visible={boolean}
  title="Dialog Title"
  message="Optional message"
  onDismiss={() => setVisible(false)}
  buttons={[
    { label: 'Option 1', onPress: () => {} },
    { label: 'Option 2', onPress: () => {} },
    { label: 'Cancel', style: 'cancel', onPress: () => {} },
  ]}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `visible` | boolean | Show/hide dialog |
| `title` | string | Dialog title |
| `message` | string? | Optional message |
| `buttons` | DialogButton[] | Button configurations |
| `onDismiss` | () => void | Called on backdrop tap |

**DialogButton:**

```typescript
interface DialogButton {
  label: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}
```

---

### EmptyState

Placeholder for empty lists.

```tsx
import EmptyState from '../components/EmptyState';

<EmptyState
  icon="👗"
  title="Your wardrobe is empty"
  message="Start by adding your first item"
  actionLabel="Add Item"
  onAction={() => navigate('AddItem')}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `icon` | string? | Emoji icon (default: 👕) |
| `title` | string | Main title |
| `message` | string? | Subtitle text |
| `actionLabel` | string? | Button text |
| `onAction` | () => void | Button handler |

---

### ErrorBoundary

Catches React errors and shows fallback UI.

```tsx
import ErrorBoundary from '../components/ErrorBoundary';

<ErrorBoundary fallback={<CustomError />}>
  <App />
</ErrorBoundary>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `children` | ReactNode | Child components |
| `fallback` | ReactNode? | Custom error UI |

---

### ImagePickerButton

Button that opens image selection dialog.

```tsx
import ImagePickerButton from '../components/ImagePickerButton';

<ImagePickerButton
  title="Add Photo"
  onImageSelected={(uri) => setImages([...images, uri])}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `title` | string? | Button text (default: "Pick an Image") |
| `onImageSelected` | (uri: string) => void | Called with selected URI |

---

### LoadingScreen

Full-screen loading indicator.

```tsx
import LoadingScreen from '../components/LoadingScreen';

<LoadingScreen
  message="Loading..."
  showMigration={true}
  migrationInfo={{ fromVersion: 1, toVersion: 2 }}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `message` | string? | Loading text |
| `showMigration` | boolean? | Show migration progress |
| `migrationInfo` | object? | Migration version info |

---

## Types

Located in `src/types/index.ts`

### WardrobeItem

```typescript
interface WardrobeItem {
  id: number;
  name: string;
  description: string;
  category: string;
  created_at: number;
  updated_at: number;
  deleted?: 0 | 1;
  metadata: Record<string, any>;
  tags: string[];
  images: string[];
}
```

### NewItemData

```typescript
type NewItemData = {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>;
  tags: string[];
  images?: string[];
};
```

### UpdateItemData

```typescript
type UpdateItemData = {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>;
  tags: string[];
  images?: string[];
};
```

### RootStackParamList

```typescript
type RootStackParamList = {
  Home: undefined;
  ItemDetails: { itemId: number };
  AddItem: undefined;
  Settings: undefined;
};
```

### ThemeMode

```typescript
type ThemeMode = 'light' | 'dark' | 'system';
```
