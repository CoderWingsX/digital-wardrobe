// src/contexts/DatabaseContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { initDatabase } from '../database';
import { WardrobeItem, NewItemData, UpdateItemData } from '../types';
import {
  loadItems,
  addItem as dbAddItem,
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
  clearAll as dbClearAll,
} from '../database/queries';
import { dbLog, dbError, uiLog } from '../lib/logger';

type DBContextValue = {
  dbReady: boolean;
  loading: boolean;
  items: WardrobeItem[];
  refresh: () => Promise<void>;
  addItemOptimistic: (data: NewItemData) => Promise<WardrobeItem>;
  updateItemOptimistic: (
    id: number,
    data: UpdateItemData
  ) => Promise<WardrobeItem>;
  deleteItemOptimistic: (id: number) => Promise<void>;
  clearAllOptimistic: () => Promise<void>;
};

const DatabaseContext = createContext<DBContextValue | undefined>(undefined);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(true); // Start loading true
  const [items, setItems] = useState<WardrobeItem[]>([]);

  // Initialize DB and load initial items
  useEffect(() => {
    (async () => {
      try {
        dbLog('Initializing database...');
        await initDatabase();
        setDbReady(true);
        await refresh(); // Load initial data
        dbLog('Database is ready.');
      } catch (e) {
        dbError('Error initializing database:', e);
      }
    })();
  }, []);

  // NOTE: We intentionally do not subscribe to dbEvents here for
  // user-initiated writes because the optimistic helpers already
  // reconcile state. dbEvents is useful for external processes
  // (background sync), but it can cause redundant refreshes for
  // normal flows.

  const refresh = async () => {
    setLoading(true);
    try {
      const fresh = await loadItems();
      setItems(fresh);
    } catch (e) {
      console.error('[db] Error refreshing items:', e);
    } finally {
      setLoading(false);
    }
  };

  const addItemOptimistic = async (
    data: NewItemData
  ): Promise<WardrobeItem> => {
    const tempId = Date.now() * -1; // negative temp id
    const now = Date.now();
    const tempItem: WardrobeItem = {
      id: tempId,
      user_id: undefined,
      name: data.name,
      description: data.description,
      category: data.category,
      created_at: now,
      updated_at: now,
      pending_sync: 1,
      deleted: 0,
      metadata: data.metadata || {},
      tags: data.tags || [],
      images: [],
    };

    // 1. Optimistic state update
    uiLog('addItemOptimistic start', { tempId, payload: data });
    setItems((s) => [tempItem, ...s]);

    try {
      // 2. Call DB. This now returns the canonical item.
      const canonicalItem = await dbAddItem(data);

      // 3. Reconcile state: replace temp item with canonical one
      setItems((currentItems) =>
        currentItems.map((it) => (it.id === tempId ? canonicalItem : it))
      );
      uiLog('addItemOptimistic success', { tempId, id: canonicalItem.id });
      return canonicalItem;
    } catch (err) {
      // 4. Rollback: remove temp item
      setItems((s) => s.filter((it) => it.id !== tempId));
      dbError('addItemOptimistic failed:', err, { tempId });
      throw err;
    }
  };

  const updateItemOptimistic = async (
    id: number,
    data: UpdateItemData
  ): Promise<WardrobeItem> => {
    const prevItems = items; // Store full previous state for rollback
    const prevItem = prevItems.find((i) => i.id === id);
    if (!prevItem) throw new Error(`Item ${id} not found`);

    const updatedLocal: WardrobeItem = {
      ...prevItem,
      ...data, // Spread the new data
      updated_at: Date.now(),
      pending_sync: 1,
    };

    // 1. Optimistic state update
    uiLog('updateItemOptimistic start', { id, payload: data });
    setItems((s) => s.map((it) => (it.id === id ? updatedLocal : it)));

    try {
      // 2. Call DB. This now returns the updated canonical item.
      const canonicalItem = await dbUpdateItem(id, data);

      // 3. Reconcile state: replace local item with canonical one
      setItems((currentItems) =>
        currentItems.map((it) => (it.id === id ? canonicalItem : it))
      );
      uiLog('updateItemOptimistic success', { id });
      return canonicalItem;
    } catch (err) {
      // 4. Rollback: restore previous state
      setItems(prevItems);
      dbError('updateItemOptimistic failed:', err, { id });
      throw err;
    }
  };

  const deleteItemOptimistic = async (id: number): Promise<void> => {
    const prev = items.find((i) => i.id === id);
    if (!prev) return; // Already deleted or doesn't exist

    // 1. Optimistic state update
    uiLog('deleteItemOptimistic start', { id });
    setItems((s) => s.filter((it) => it.id !== id));

    try {
      // 2. Call DB
      await dbDeleteItem(id);
      uiLog('deleteItemOptimistic success', { id });
      // 3. On success, do nothing. State is already correct.
    } catch (err) {
      // 4. Rollback: add item back
      setItems((s) => [prev, ...s]); // Or restore full list if order matters
      dbError('deleteItemOptimistic failed:', err, { id });
      throw err;
    }
  };

  const clearAllOptimistic = async () => {
    const prev = items;
    // 1. Optimistic update
    uiLog('clearAllOptimistic start');
    setItems([]);
    try {
      // 2. Call DB
      await dbClearAll();
      uiLog('clearAllOptimistic success');
      // 3. On success, do nothing.
    } catch (err) {
      // 4. Rollback
      setItems(prev);
      dbError('clearAllOptimistic failed:', err);
      throw err;
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        dbReady,
        loading,
        items,
        refresh,
        addItemOptimistic,
        updateItemOptimistic,
        deleteItemOptimistic,
        clearAllOptimistic,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
};
