// src/components/LoadingScreen.tsx

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  message?: string;
  showMigration?: boolean;
  migrationInfo?: {
    fromVersion: number;
    toVersion: number;
  };
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  showMigration = false,
  migrationInfo 
}: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.message}>{message}</Text>
      
      {showMigration && migrationInfo && (
        <View style={styles.migrationInfo}>
          <Text style={styles.migrationText}>
            Upgrading database: v{migrationInfo.fromVersion} → v{migrationInfo.toVersion}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  migrationInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  migrationText: {
    fontSize: 12,
    color: '#888',
  },
});
