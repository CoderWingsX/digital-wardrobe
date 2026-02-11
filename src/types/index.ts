// src/types/index.ts

export interface WardrobeItem {
  id: number;
  name: string;
  description: string;
  category: string;
  created_at: number;
  updated_at: number;
  deleted?: 0 | 1;
  // Nested data
  metadata: Record<string, any>;
  tags: string[];
  images: string[];
}

// Tab navigation types
export type TabParamList = {
  Home: undefined;
  Wardrobe: undefined;
  Add: undefined;
  Settings: undefined;
  ItemDetails: { itemId: number };
};



// Stack navigation types (for screens that need to be pushed on top of tabs)
export type RootStackParamList = {
  Tabs: undefined;
};

// Filter state for search screen
export interface FilterState {
  selectedTags: string[];
  selectedCategories: string[];
  sortBy: 'newest' | 'oldest' | 'alphabetical';
}

// Type for adding a new item.
export type NewItemData = {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>; // structured
  tags: string[];
  images?: string[];
};

// Type for updating an item.
export type UpdateItemData = {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>;
  tags: string[];
  images?: string[];
};

// Define more types as needed
