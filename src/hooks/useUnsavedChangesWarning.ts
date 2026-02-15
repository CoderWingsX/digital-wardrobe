import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to show a confirmation dialog when user tries to navigate away with unsaved changes.
 * Works with both hardware back button and gesture navigation.
 * 
 * @param hasUnsavedChanges - Whether there are unsaved changes to warn about
 * @param message - Optional custom message for the alert
 * @returns Object with skipWarningOnce function to bypass warning for intentional navigation (e.g., after save)
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to discard them?'
) {
  const navigation = useNavigation();
  const skipNextWarning = useRef(false);

  // Call this before navigation.goBack() when saving successfully
  const skipWarningOnce = useCallback(() => {
    skipNextWarning.current = true;
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Skip warning if intentionally navigating (e.g., after save)
      if (skipNextWarning.current) {
        skipNextWarning.current = false;
        return;
      }

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

  return { skipWarningOnce };
}
