import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to show a confirmation dialog when user tries to navigate away with unsaved changes.
 * Works with back button, gestures, and programmatic navigation.
 * 
 * @param hasUnsavedChanges - Whether there are unsaved changes to warn about
 * @param message - Optional custom message for the alert
 * @returns Object with skipWarningOnce function to bypass warning (call before goBack after save)
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to discard them?'
) {
  const navigation = useNavigation();
  const skipNextWarning = useRef(false);
  const hasUnsavedRef = useRef(hasUnsavedChanges);

  // Keep ref in sync with prop (refs are checked inside callback)
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const skipWarningOnce = useCallback(() => {
    skipNextWarning.current = true;
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Check ref at event time, not setup time
      if (!hasUnsavedRef.current) return;
      
      if (skipNextWarning.current) {
        skipNextWarning.current = false;
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Discard Changes?',
        message,
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [message, navigation]);

  return { skipWarningOnce };
}
