// src/screens/HomeScreen/styles.tsx

import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

export const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    statsContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    statLabel: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    categoryBreakdown: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
    },
    recentItemsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    recentItem: {
      width: 100,
      alignItems: 'center',
    },
    recentItemImage: {
      width: 100,
      height: 100,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 6,
    },
    recentItemPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 8,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    recentItemName: {
      fontSize: 13,
      color: colors.text,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    shuffleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shuffleCard: {
      flex: 1,
      alignItems: 'center',
    },
    shuffleImageContainer: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 8,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.border,
    },
    shuffleImage: {
      width: '100%',
      height: '100%',
    },
    shufflePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    shuffleLabelBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    shuffleLabelText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    shuffleItemName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    shufflePlus: {
      marginHorizontal: 12,
    },
    shuffleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shuffleButtonText: {
      marginLeft: 4,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    emptyShuffleBox: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
  });
