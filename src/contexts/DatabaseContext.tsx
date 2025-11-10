// src/contexts/DBContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { initDatabase } from '../database';

/**
 * Context to manage database initialization state.
 * Provides a flag indicating whether the database is ready.
 * Components can use this to delay rendering until the DB is set up.
 */
const DBContext = createContext<{ dbReady: boolean }>({ dbReady: false });

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        console.log('Initializing database...');
        await initDatabase();
        setDbReady(true);
        console.log('Database is ready.');
      } catch (e) {
        console.error('Error initializing database:', e);
      }
    })();
  }, []);

  return (
    <DBContext.Provider value={{ dbReady }}>{children}</DBContext.Provider>
  );
};

export const useDatabase = () => useContext(DBContext);
