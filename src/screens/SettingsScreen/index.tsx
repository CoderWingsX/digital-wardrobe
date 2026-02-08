// src/screens/SettingsScreen/index.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useDatabase } from '../../contexts/DatabaseContext';
import {
  cleanupOrphanedImages,
  cleanupOrphanedRecords,
  vacuumDatabase,
  validateDatabaseIntegrity,
  exportData,
  getDatabaseStats,
} from '../../database/maintenance';
import styles from './styles';

export default function SettingsScreen() {
  const { schemaVersion, items, categories, allTags } = useDatabase();
  const [loading, setLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    itemCount: number;
    tagCount: number;
    imageCount: number;
    deletedItemCount: number;
  } | null>(null);

  const runWithLoading = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const handleRefreshStats = async () => {
    await runWithLoading('stats', async () => {
      const result = await getDatabaseStats();
      setStats(result);
    });
  };

  const handleValidateIntegrity = async () => {
    await runWithLoading('validate', async () => {
      const result = await validateDatabaseIntegrity();
      if (result.ok) {
        Alert.alert('Integrity Check', 'Database integrity is OK!');
      } else {
        Alert.alert('Integrity Issues Found', result.issues.join('\n'), [{ text: 'OK' }]);
      }
    });
  };

  const handleCleanupImages = async () => {
    Alert.alert(
      'Cleanup Orphaned Images',
      'This will delete image files that are no longer referenced. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          onPress: async () => {
            await runWithLoading('cleanupImages', async () => {
              const result = await cleanupOrphanedImages();
              Alert.alert(
                'Cleanup Complete',
                `Deleted: ${result.deleted.length} files\nErrors: ${result.errors.length}`
              );
            });
          },
        },
      ]
    );
  };

  const handleCleanupRecords = async () => {
    Alert.alert(
      'Cleanup Orphaned Records',
      'This will remove orphaned database records. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          onPress: async () => {
            await runWithLoading('cleanupRecords', async () => {
              const result = await cleanupOrphanedRecords();
              Alert.alert(
                'Cleanup Complete',
                `Removed:\n- ${result.metadata} metadata\n- ${result.itemTags} item-tag links\n- ${result.tags} unused tags`
              );
            });
          },
        },
      ]
    );
  };

  const handleVacuum = async () => {
    Alert.alert(
      'Vacuum Database',
      'This will permanently delete soft-deleted items and reclaim storage space. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Vacuum',
          style: 'destructive',
          onPress: async () => {
            await runWithLoading('vacuum', async () => {
              const result = await vacuumDatabase();
              Alert.alert(
                'Vacuum Complete',
                `Permanently deleted:\n- ${result.items} items\n- ${result.metadata} metadata\n- ${result.images} images\n- ${result.itemTags} tag links\n- ${result.tags} tags`
              );
              await handleRefreshStats();
            });
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    await runWithLoading('export', async () => {
      const data = await exportData();
      const jsonString = JSON.stringify(data, null, 2);
      
      try {
        await Share.share({
          message: jsonString,
          title: 'Digital Wardrobe Backup',
        });
      } catch {
        Alert.alert('Export Failed', 'Could not share the data');
      }
    });
  };

  const renderButton = (
    key: string,
    label: string,
    onPress: () => void,
    destructive = false
  ) => (
    <TouchableOpacity
      style={[styles.button, destructive && styles.destructiveButton]}
      onPress={onPress}
      disabled={loading !== null}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {loading === key ? (
        <ActivityIndicator color={destructive ? '#fff' : '#007AFF'} />
      ) : (
        <Text style={[styles.buttonText, destructive && styles.destructiveButtonText]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Schema Version</Text>
          <Text style={styles.infoValue}>v{schemaVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Items</Text>
          <Text style={styles.infoValue}>{items.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Categories</Text>
          <Text style={styles.infoValue}>{categories.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tags</Text>
          <Text style={styles.infoValue}>{allTags.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Stats</Text>
        {stats ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Items</Text>
              <Text style={styles.infoValue}>{stats.itemCount}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Tags</Text>
              <Text style={styles.infoValue}>{stats.tagCount}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Images</Text>
              <Text style={styles.infoValue}>{stats.imageCount}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deleted (pending vacuum)</Text>
              <Text style={styles.infoValue}>{stats.deletedItemCount}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.infoHint}>Tap refresh to load stats</Text>
        )}
        {renderButton('stats', 'Refresh Stats', handleRefreshStats)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maintenance</Text>
        <Text style={styles.sectionHint}>Keep your database clean and optimized</Text>
        {renderButton('validate', 'Validate Integrity', handleValidateIntegrity)}
        {renderButton('cleanupImages', 'Cleanup Orphaned Images', handleCleanupImages)}
        {renderButton('cleanupRecords', 'Cleanup Orphaned Records', handleCleanupRecords)}
        {renderButton('vacuum', 'Vacuum Database', handleVacuum, true)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        {renderButton('export', 'Export Data (JSON)', handleExportData)}
      </View>
    </ScrollView>
  );
}
