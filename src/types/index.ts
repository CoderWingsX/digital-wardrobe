// src/types/index.ts

export interface WardrobeItem {
  id: number;
  user_id?: string; // Will come from Supabase Auth
  name: string;
  description: string;
  category: string;
  created_at: number;
  updated_at: number;
  pending_sync: 0 | 1;
  deleted: 0 | 1;
  // Nested data
  metadata: Record<string, any>;
  tags: string[];
  images: string[]; // Array of image paths/URLs
}

// Needs to be modified if a new screen is added
export type RootStackParamList = {
  Home: undefined;
  ItemDetails: { itemId: number };
};

// Type for adding a new item.
export type NewItemData = {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>; // structured
  tags: string[];
};

// Type for updating an item.
export type UpdateItemData = {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>;
  tags: string[];
};

// Define more types as needed
