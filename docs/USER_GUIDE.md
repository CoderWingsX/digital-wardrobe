# User Guide

Complete guide for using the Digital Wardrobe app.

## Table of Contents

- [Getting Started](#getting-started)
- [Adding Items](#adding-items)
- [Viewing Items](#viewing-items)
- [Editing Items](#editing-items)
- [Deleting Items](#deleting-items)
- [Search & Filter](#search--filter)
- [Settings](#settings)
- [Test Data](#test-data)

---

## Getting Started

When you first open the app, you'll see an empty wardrobe with an "Add Item" button. The app stores all data locally on your device - no account or internet connection required.

### Home Screen

The home screen displays:
- **Add Item** button - Add new clothing items
- **Clear All** button - Remove all items (with confirmation)
- **Search bar** - Search your wardrobe
- **Item list** - All your wardrobe items

---

## Adding Items

1. Tap **Add Item** on the home screen
2. Fill in the required fields (marked with red asterisk *):
   - **Name** - Item name (e.g., "Blue Denim Jacket")
   - **Description** - Brief description
   - **Category** - Category (e.g., "Tops", "Bottoms", "Shoes")

### Adding Photos

1. Tap **Pick an Image**
2. Choose an option:
   - **Choose from Library** - Select from your photo library
   - **Take Photo** - Take a new photo with camera
   - **Cancel** - Close without selecting

You can add multiple photos to a single item.

### Adding Metadata

Metadata lets you store custom information about each item:

1. Tap **+ Add Metadata Field**
2. Enter a **Key** (e.g., "Brand", "Size", "Color")
3. Enter a **Value** (e.g., "Nike", "Medium", "Navy Blue")
4. Repeat for additional metadata

Common metadata examples:
- Brand: Nike
- Size: M / L / 32x30
- Color: Navy Blue
- Material: 100% Cotton
- Price: $49.99
- Purchase Date: 2024-01-15

### Adding Tags

Tags help organize and find items:

1. Enter tags in the **Tags** field
2. Separate multiple tags with commas
3. Example: `casual, summer, favorite, work`

### Multi-Add Mode

To add multiple items quickly:

1. Toggle **Add multiple items** switch ON
2. After saving, the form clears but stays open
3. Continue adding items
4. Toggle OFF when done

---

## Viewing Items

### Item List

The home screen shows all items with:
- Thumbnail image (or placeholder icon)
- Item name
- Category
- Description preview

Tap any item to view details.

### Item Details

The detail view shows:
- **Image carousel** - Swipe to see all photos, tap to view full-screen
- **Name, Category, Description**
- **Metadata** - All custom key-value pairs
- **Tags** - All assigned tags
- **Edit/Delete buttons**

### Full-Screen Images

1. Tap any image to view full-screen
2. Swipe left/right to navigate images
3. Pinch to zoom
4. Swipe down or tap X to close

---

## Editing Items

1. Open item details
2. Tap **Edit**
3. Modify any fields:
   - Change name, description, category
   - Add/remove metadata fields
   - Update tags
   - Add/remove images
4. Tap **Save** to confirm
5. Tap **Cancel** to discard changes

### Unsaved Changes Warning

If you try to navigate away (back button or gesture) while you have unsaved changes, the app will show a confirmation dialog:

- **Keep Editing** - Stay on the screen and continue editing
- **Discard** - Lose your changes and navigate away

This warning appears when:
- **Adding items** - Any field has content (name, description, category, images, tags, or metadata)
- **Editing items** - Any field differs from the original saved values

---

## Deleting Items

### Delete Single Item

1. Open item details
2. Tap **Delete**
3. Confirm deletion

### Clear All Items

1. On home screen, tap **Clear All**
2. Confirm to delete ALL items

> **Note:** Deleted items are soft-deleted first. Use "Vacuum Database" in Settings to permanently remove them and reclaim storage.

---

## Search & Filter

### Basic Search

1. Tap the search bar on home screen
2. Type your search query
3. Results filter in real-time

### What's Searchable

- Item names
- Categories
- Tags
- Metadata keys and values

### Search Suggestions

As you type, suggestions appear showing:
- Matching item names (tap to go directly to item)
- Matching categories
- Matching tags
- Matching metadata

---

## Settings

Access settings by tapping the ⚙️ gear icon on the home screen.

### Appearance

Choose your preferred theme:
- **System** - Follow device settings (default)
- **Light** - Always light mode
- **Dark** - Always dark mode

### App Info

Displays:
- Schema version
- Total items count
- Categories count
- Tags count

### Database Stats

Tap **Refresh Stats** to see:
- Total items (including deleted)
- Total tags
- Total images
- Deleted items pending vacuum

### Maintenance

#### Validate Integrity
Checks database for:
- Data corruption
- Foreign key violations
- Orphaned records

#### Cleanup Orphaned Images
Deletes image files that are no longer referenced by any item.

#### Cleanup Orphaned Records
Removes database records that have lost their parent references.

#### Vacuum Database
- Permanently deletes soft-deleted items
- Removes associated files
- Reclaims storage space
- **Warning:** This cannot be undone!

### Data Export

Tap **Export Data (JSON)** to:
- Export all wardrobe data as JSON
- Share via email, messages, or save to files

---

## Test Data

For testing search and filtering capabilities, you can load sample wardrobe items.

### Loading Test Data

1. Go to **Settings**
2. Scroll to **Test Data** section
3. View available items and categories
4. Tap **Load Test Data**
5. Choose:
   - **Load (with images)** - Downloads sample images (slower)
   - **Load (no images)** - Text only (faster)
   - **Cancel**

### What's Included

32 sample items across 6 categories:
- **Tops** - T-shirts, polos, shirts, hoodies, sweaters
- **Bottoms** - Jeans, chinos, shorts, skirts
- **Dresses** - Various dress styles
- **Outerwear** - Jackets, coats
- **Shoes** - Sneakers, boots, loafers
- **Accessories** - Bags, belts, watches, sunglasses

Each item includes:
- Realistic name and description
- Category
- Metadata (brand, color, size, material, price)
- Tags (style, season, occasion)

### Removing Test Data

1. Go to **Settings**
2. Scroll to **Test Data** section
3. Tap **Remove All Test Data**
4. Confirm removal

Test items are identified by the `test-data` tag or `testData: true` metadata.

---

## Tips & Tricks

1. **Consistent Categories** - Use the same category names for better organization
2. **Tag Generously** - More tags = better searchability
3. **Add Key Metadata** - Brand, size, and color are most useful
4. **Regular Backups** - Export your data periodically
5. **Vacuum Occasionally** - Reclaim space from deleted items
