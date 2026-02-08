// App.tsx

import React from 'react';
import { StatusBar } from 'react-native';
import { DatabaseProvider, useDatabase } from './src/contexts/DatabaseContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './toastConfig';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';

function AppContent() {
  const { initializing, dbReady, dbError, migrationInfo } = useDatabase();
  const { isDark } = useTheme();

  if (initializing) {
    return (
      <LoadingScreen 
        message="Starting up..." 
        showMigration={migrationInfo !== null && migrationInfo.migrationsRun > 0}
        migrationInfo={migrationInfo ?? undefined}
      />
    );
  }

  if (dbError) {
    return <LoadingScreen message={`Database error: ${dbError.message}`} />;
  }

  if (!dbReady) {
    return <LoadingScreen message="Preparing database..." />;
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
      <Toast config={toastConfig} position="bottom" />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DatabaseProvider>
          <AppContent />
        </DatabaseProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
