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
  addItem,
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
  clearAll as dbClearAll,
} from '../database/queries';

type DBContextValue = {
  dbReady: boolean;
  loading: boolean;
  items: WardrobeItem[];
  refresh: (force?: boolean) => Promise<void>;
  addItemOptimistic: (data: NewItemData) => Promise<number>;
  updateItemOptimistic: (id: number, data: UpdateItemData) => Promise<void>;
  deleteItemOptimistic: (id: number) => Promise<void>;
  clearAllOptimistic: () => Promise<void>;
};

const DatabaseContext = createContext<DBContextValue | undefined>(undefined);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);

  // Initialize DB and load initial items
  useEffect(() => {
    (async () => {
      try {
        console.log('[db] Initializing database...');
        await initDatabase();
        setDbReady(true);
        await refresh();
        console.log('[db] Database is ready.');
      } catch (e) {
        console.error('[db] Error initializing database:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async (force = false) => {
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

  // Optimistic add: insert a temporary item into state, call DB, then reconcile
  const addItemOptimistic = async (data: NewItemData): Promise<number> => {
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

    setItems((s) => [tempItem, ...s]);

    try {
      const newId = await addItem(data);
      // After successful DB write, refresh to get canonical data (ids, images, etc.)
      await refresh(true);
      return newId;
    } catch (err) {
      // rollback optimistic
      setItems((s) => s.filter((it) => it.id !== tempId));
      console.error('[db] addItemOptimistic failed:', err);
      throw err;
    }
  };

  // Optimistic update: apply changes locally, call DB, then reconcile
  const updateItemOptimistic = async (id: number, data: UpdateItemData) => {
    const prev = items.find((i) => i.id === id);
    if (!prev) {
      throw new Error(`Item ${id} not found in cache`);
    }

    const updatedLocal: WardrobeItem = {
      ...prev,
      name: data.name,
      description: data.description,
      category: data.category,
      metadata: data.metadata,
      tags: data.tags,
      updated_at: Date.now(),
      pending_sync: 1,
    };

    setItems((s) => s.map((it) => (it.id === id ? updatedLocal : it)));

    try {
      await dbUpdateItem(id, data);
      await refresh(true);
    } catch (err) {
      // rollback
      setItems((s) => s.map((it) => (it.id === id ? prev : it)));
      console.error('[db] updateItemOptimistic failed:', err);
      throw err;
    }
  };

  const deleteItemOptimistic = async (id: number) => {
    const prev = items.find((i) => i.id === id);
    setItems((s) => s.filter((it) => it.id !== id));

    try {
      await dbDeleteItem(id);
      await refresh(true);
    } catch (err) {
      // rollback
      if (prev) setItems((s) => [prev, ...s]);
      console.error('[db] deleteItemOptimistic failed:', err);
      throw err;
    }
  };

  const clearAllOptimistic = async () => {
    const prev = items;
    setItems([]);
    try {
      await dbClearAll();
      await refresh(true);
    } catch (err) {
      setItems(prev);
      console.error('[db] clearAllOptimistic failed:', err);
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
