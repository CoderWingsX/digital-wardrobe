// src/screens/SettingsScreen/index.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import Dialog from 'react-native-dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import {
  cleanupOrphanedImages,
  cleanupOrphanedRecords,
  vacuumDatabase,
  validateDatabaseIntegrity,
  exportData,
  getDatabaseStats,
} from '../../database/maintenance';
import {
  loadTestData,
  unloadTestData,
  getTestDataCount,
  getAvailableTestData,
} from '../../data/testDataLoader';
import { createStyles } from './styles';

export default function SettingsScreen() {
  const { schemaVersion, items, categories, allTags, refresh } = useDatabase();
  const { mode, setMode, colors } = useTheme();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    itemCount: number;
    tagCount: number;
    imageCount: number;
    deletedItemCount: number;
  } | null>(null);
  const [testDataCount, setTestDataCount] = useState<number>(0);
  const [loadTestDialogVisible, setLoadTestDialogVisible] = useState(false);
  const testDataInfo = getAvailableTestData();

  useEffect(() => {
    getTestDataCount().then(setTestDataCount);
  }, [items]);

  const handleLoadTestData = async (withImages: boolean) => {
    setLoadTestDialogVisible(false);
    await runWithLoading('loadTest', async () => {
      const result = await loadTestData(undefined, withImages);
      await refresh();
      Alert.alert('Test Data Loaded', `Loaded: ${result.loaded}\nFailed: ${result.failed}`);
    });
  };

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
        <ActivityIndicator color={destructive ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, destructive && styles.destructiveButtonText]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderThemeOption = (value: ThemeMode, label: string) => (
    <TouchableOpacity
      style={[styles.themeOption, mode === value && styles.themeOptionActive]}
      onPress={() => setMode(value)}
      accessibilityLabel={`${label} theme`}
      accessibilityRole="button"
    >
      <Text style={[styles.themeOptionText, mode === value && styles.themeOptionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['bottom']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeSelector}>
          {renderThemeOption('system', 'System')}
          {renderThemeOption('light', 'Light')}
          {renderThemeOption('dark', 'Dark')}
        </View>
      </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Data</Text>
        <Text style={styles.sectionHint}>
          Load sample items to test search and filtering
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Available Items</Text>
          <Text style={styles.infoValue}>{testDataInfo.total}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Currently Loaded</Text>
          <Text style={styles.infoValue}>{testDataCount}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Categories</Text>
          <Text style={styles.infoValue}>{testDataInfo.categories.join(', ')}</Text>
        </View>
        {renderButton('loadTest', `Load Test Data (~${Math.ceil(testDataInfo.total / 2)} items)`, () => {
          setLoadTestDialogVisible(true);
        })}
        
        <Dialog.Container visible={loadTestDialogVisible}>
          <Dialog.Title>Load Test Data</Dialog.Title>
          <Dialog.Description>
            This will download images and add test items to your wardrobe. Continue?
          </Dialog.Description>
          <Dialog.Button label="Cancel" onPress={() => setLoadTestDialogVisible(false)} />
          <Dialog.Button label="Load (no images)" onPress={() => handleLoadTestData(false)} />
          <Dialog.Button label="Load (with images)" onPress={() => handleLoadTestData(true)} />
        </Dialog.Container>
        {renderButton('unloadTest', 'Remove All Test Data', async () => {
          if (testDataCount === 0) {
            Alert.alert('No Test Data', 'There is no test data to remove.');
            return;
          }
          Alert.alert(
            'Remove Test Data',
            `This will remove ${testDataCount} test items and their images. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await runWithLoading('unloadTest', async () => {
                    const result = await unloadTestData();
                    await refresh();
                    Alert.alert('Test Data Removed', `Removed: ${result.removed} items`);
                  });
                },
              },
            ]
          );
        }, true)}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
