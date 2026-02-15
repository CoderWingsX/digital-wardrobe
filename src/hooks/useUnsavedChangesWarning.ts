import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to show a confirmation dialog when user tries to navigate away with unsaved changes.
 * Works with back button, gestures, and programmatic navigation.
 * 
 * @param hasUnsavedChanges - Whether there are unsaved changes to warn about
 * @param message - Optional custom message for the alert
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to discard them?'
) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
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
  }, [hasUnsavedChanges, message, navigation]);
}
