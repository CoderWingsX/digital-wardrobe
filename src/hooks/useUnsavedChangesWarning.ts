import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to show a confirmation dialog when user tries to navigate away with unsaved changes.
 * Works with hardware back button, gesture navigation, and Cancel buttons.
 * 
 * @param hasUnsavedChanges - Whether there are unsaved changes to warn about
 * @param message - Optional custom message for the alert
 * @returns Object with showWarningIfNeeded helper function
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to discard them?'
) {
  const navigation = useNavigation();

  // Handle back button and gesture navigation
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation dialog
      Alert.alert(
        'Discard Changes?',
        message,
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [hasUnsavedChanges, message, navigation]);

  /**
   * Helper function to show warning before executing an action.
   * Use this for Cancel buttons or any action that should warn about unsaved changes.
   * 
   * @param onDiscard - Callback to execute if user chooses to discard changes
   */
  const showWarningIfNeeded = useCallback((onDiscard: () => void) => {
    if (!hasUnsavedChanges) {
      onDiscard();
      return;
    }

    Alert.alert(
      'Discard Changes?',
      message,
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: onDiscard,
        },
      ]
    );
  }, [hasUnsavedChanges, message]);

  return { showWarningIfNeeded };
}
