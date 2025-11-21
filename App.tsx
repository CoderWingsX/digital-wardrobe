// App.tsx

import React from 'react';
import { DatabaseProvider } from './src/contexts/DatabaseContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './toastConfig';
/**
 * The main App component.
 * Only responsible for wrapping providers.
 */
export default function App() {
  return (
    <DatabaseProvider>
      <AppNavigator />
      <Toast config={toastConfig} position="bottom" />
    </DatabaseProvider>
  );
}
``