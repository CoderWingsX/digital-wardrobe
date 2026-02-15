import { useEffect, useRef, MutableRefObject } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Hook to show a confirmation dialog when user tries to navigate away with unsaved changes.
 * Works with back button, gestures, and programmatic navigation.
 * 
 * @param hasUnsavedChanges - Whether there are unsaved changes to warn about
 * @param options - Optional config: message and skipRef to bypass warning
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  options?: {
    message?: string;
    skipRef?: MutableRefObject<boolean>;
  }
) {
  const navigation = useNavigation();
  const message = options?.message ?? 'You have unsaved changes. Are you sure you want to discard them?';
  const skipRef = options?.skipRef;
  const hasUnsavedRef = useRef(hasUnsavedChanges);
  
  // Keep ref in sync with prop
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Check refs at event time, not at setup time
      if (!hasUnsavedRef.current) return;
      if (skipRef?.current) {
        skipRef.current = false;
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
  }, [message, navigation, skipRef]);
}
