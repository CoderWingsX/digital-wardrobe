// src/contexts/DatabaseContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initDatabase, getMigrationResult, getSchemaVersion } from '../database';
import { WardrobeItem, NewItemData, UpdateItemData } from '../types';
import {
  loadItems,
  addItem as dbAddItem,
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
  clearAll as dbClearAll,
} from '../database/queries';
import { getCategories, getAllTags } from '../database/maintenance';
import { dbEvents } from '../database';
import { dbLog, dbError, uiLog } from '../lib/logger';

type MigrationInfo = {
  fromVersion: number;
  toVersion: number;
  migrationsRun: number;
};

type DBContextValue = {
  dbReady: boolean;
  dbError: Error | null;
  loading: boolean;
  initializing: boolean;
  migrationInfo: MigrationInfo | null;
  schemaVersion: number;
  items: WardrobeItem[];
  categories: string[];
  allTags: string[];
  refresh: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshTags: () => Promise<void>;
  addItemOptimistic: (data: NewItemData) => Promise<WardrobeItem>;
  updateItemOptimistic: (id: number, data: UpdateItemData) => Promise<WardrobeItem>;
  deleteItemOptimistic: (id: number) => Promise<void>;
  clearAllOptimistic: () => Promise<void>;
};

const DatabaseContext = createContext<DBContextValue | undefined>(undefined);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [dbReady, setDbReady] = useState(false);
  const [dbInitError, setDbInitError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [migrationInfo, setMigrationInfo] = useState<MigrationInfo | null>(null);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Initialize DB and load initial items
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        dbLog('Initializing database...');
        setInitializing(true);

        await initDatabase();

        if (!mounted) return;

        const migResult = getMigrationResult();
        if (migResult) {
          setMigrationInfo(migResult);
          if (migResult.migrationsRun > 0) {
            dbLog(`Migrations completed: v${migResult.fromVersion} -> v${migResult.toVersion}`);
          }
        }

        setDbReady(true);
        setDbInitError(null);

        await refresh();
        await refreshCategories();
        await refreshTags();

        dbLog('Database is ready.');
      } catch (e) {
        dbError('Error initializing database:', e);
        if (mounted) {
          setDbInitError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();

    const unsub = dbEvents.on('itemsChanged', async (payload) => {
      if (!mounted) return;
      try {
        dbLog('dbEvents.itemsChanged received, refreshing cache', payload);
        await refresh();
        await refreshCategories();
        await refreshTags();
      } catch (e) {
        dbError('Error refreshing on dbEvents.itemsChanged:', e);
      }
    });

    return () => {
      mounted = false;
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const fresh = await loadItems();
      setItems(fresh);
    } catch (e) {
      dbError('Error refreshing items:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      dbError('Error refreshing categories:', e);
    }
  };

  const refreshTags = async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (e) {
      dbError('Error refreshing tags:', e);
    }
  };

  const addItemOptimistic = async (data: NewItemData): Promise<WardrobeItem> => {
    const tempId = Date.now() * -1; // negative temp id
    const now = Date.now();
    const tempItem: WardrobeItem = {
      id: tempId,
      name: data.name,
      description: data.description,
      category: data.category,
      created_at: now,
      updated_at: now,
      metadata: data.metadata || {},
      tags: data.tags || [],
      images: data.images || [],
    };

    // 1. Optimistic state update
    uiLog('addItemOptimistic start', { tempId, payload: data });
    setItems((s) => [tempItem, ...s]);

    try {
      // 2. Call DB. This now returns the canonical item.
      const canonicalItem = await dbAddItem(data);

      // 3. Reconcile state: replace temp item with canonical one
      setItems((currentItems) => currentItems.map((it) => (it.id === tempId ? canonicalItem : it)));
      uiLog('addItemOptimistic success', { tempId, id: canonicalItem.id });
      return canonicalItem;
    } catch (err) {
      // 4. Rollback: remove temp item
      setItems((s) => s.filter((it) => it.id !== tempId));
      dbError('addItemOptimistic failed:', err, { tempId });
      throw err;
    }
  };

  const updateItemOptimistic = async (id: number, data: UpdateItemData): Promise<WardrobeItem> => {
    const prevItems = items; // Store full previous state for rollback
    const prevItem = prevItems.find((i) => i.id === id);
    if (!prevItem) throw new Error(`Item ${id} not found`);

    const updatedLocal: WardrobeItem = {
      ...prevItem,
      ...data,
      updated_at: Date.now(),
    };

    // 1. Optimistic state update
    uiLog('updateItemOptimistic start', { id, payload: data });
    setItems((s) => s.map((it) => (it.id === id ? updatedLocal : it)));

    try {
      // 2. Call DB. This now returns the updated canonical item.
      const canonicalItem = await dbUpdateItem(id, data);

      // 3. Reconcile state: replace local item with canonical one
      setItems((currentItems) => currentItems.map((it) => (it.id === id ? canonicalItem : it)));
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
        dbError: dbInitError,
        loading,
        initializing,
        migrationInfo,
        schemaVersion: getSchemaVersion(),
        items,
        categories,
        allTags,
        refresh,
        refreshCategories,
        refreshTags,
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
