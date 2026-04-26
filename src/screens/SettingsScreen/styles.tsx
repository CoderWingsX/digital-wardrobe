// src/screens/SettingsScreen/styles.tsx

import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

export const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    sectionHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      flexShrink: 0,
      maxWidth: '40%',
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
      marginLeft: 12,
    },
    infoHint: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    button: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.primary,
    },
    destructiveButton: {
      backgroundColor: colors.danger,
    },
    destructiveButtonText: {
      color: '#fff',
    },
    themeSelector: {
      flexDirection: 'row',
      paddingRight: 16,
    },
    themeOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      marginRight: 10,
      minWidth: 100,
      // Add shadow/elevation to make them look like cards
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 3,
    },
    swatchContainer: {
      marginBottom: 8,
    },
    swatch: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    systemSwatch: {
      width: 24,
      height: 24,
      borderRadius: 12,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    swatchPart: {
      flex: 1,
      height: '100%',
    },
    swatchIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    themeOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    themeOptionTextActive: {
      color: colors.primary,
    },
  });
