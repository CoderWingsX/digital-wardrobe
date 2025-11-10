// App.tsx

import React from 'react';
import { DatabaseProvider } from './src/contexts/DatabaseContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * The main App component.
 * Only responsible for wrapping providers.
 */
export default function App() {
  return (
    <DatabaseProvider>
      <AppNavigator />
    </DatabaseProvider>
  );
}
``