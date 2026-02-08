// App.tsx

import React from 'react';
import { DatabaseProvider, useDatabase } from './src/contexts/DatabaseContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './toastConfig';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';

function AppContent() {
  const { initializing, dbReady, dbError, migrationInfo } = useDatabase();

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
      <AppNavigator />
      <Toast config={toastConfig} position="bottom" />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </ErrorBoundary>
  );
}
