// src/contexts/DatabaseContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDB } from '../database';
import { loadItems, addItem as dbAddItem, updateItem as dbUpdateItem, deleteItem as dbDeleteItem, clearAll as dbClearAll } from '../database/queries';
import { WardrobeItem, NewItemData, UpdateItemData } from '../types';

interface DBContextType {
  dbReady: boolean;
  items: WardrobeItem[];
  addItem: (data: NewItemData) => Promise<void>;
  updateItem: (id: number, data: UpdateItemData) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  refreshItems: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const DBContext = createContext<DBContextType>({
  dbReady: false,
  items: [],
  addItem: async () => {},
  updateItem: async () => {},
  deleteItem: async () => {},
  refreshItems: async () => {},
  clearAll: async () => {},
});

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [dbReady, setDbReady] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        console.log('[db] Initializing database...');
        await getDB(); // ensure DB is initialized
        await refreshItems(); // load initial items into cache
        setDbReady(true);
        console.log('[db] Database is ready.');
      } catch (err) {
        console.error('[db] Initialization failed:', err);
      }
    })();
  }, []);

  // Refresh cache from DB
  const refreshItems = async () => {
    try {
      const loadedItems = await loadItems();
      setItems(loadedItems);
    } catch (err) {
      console.error('[db] Error loading items:', err);
    }
  };

  const handleAddItem = async (data: NewItemData) => {
    await dbAddItem(data);
    await refreshItems(); // update cache
  };

  const handleUpdateItem = async (id: number, data: UpdateItemData) => {
    await dbUpdateItem(id, data);
    await refreshItems(); // update cache
  };

  const handleDeleteItem = async (id: number) => {
    await dbDeleteItem(id);
    await refreshItems(); // update cache
  };

  const handleClearAll = async () => {
    await dbClearAll();
    setItems([]); // reset cache
  };

  return (
    <DBContext.Provider
      value={{
        dbReady,
        items,
        addItem: handleAddItem,
        updateItem: handleUpdateItem,
        deleteItem: handleDeleteItem,
        refreshItems,
        clearAll: handleClearAll,
      }}
    >
      {children}
    </DBContext.Provider>
  );
};

export const useDatabase = () => useContext(DBContext);
