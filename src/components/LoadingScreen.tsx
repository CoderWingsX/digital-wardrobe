// src/components/LoadingScreen.tsx

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      
      {showMigration && migrationInfo && (
        <View style={[styles.migrationInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.migrationText, { color: colors.textMuted }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
  },
  migrationInfo: {
    marginTop: 12,
    padding: 8,
    borderRadius: 6,
  },
  migrationText: {
    fontSize: 12,
  },
});
