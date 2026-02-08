// src/components/CustomDialog.tsx

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const ANIMATION_DURATION = 200;

export interface DialogButton {
  label: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  onDismiss?: () => void;
}

export default function CustomDialog({
  visible,
  title,
  message,
  buttons,
  onDismiss,
}: Props) {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const getButtonTextColor = (style?: 'default' | 'cancel' | 'destructive') => {
    if (style === 'destructive') return '#FF3B30';
    if (style === 'cancel') return colors.textSecondary;
    return colors.primary;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[
              styles.dialog,
              { backgroundColor: isDark ? '#2C2C2E' : '#fff' },
              { transform: [{ scale: scaleAnim }] },
            ]}>
              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {message && (
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {message}
                  </Text>
                )}
              </View>
              <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      index < buttons.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                    onPress={button.onPress}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: getButtonTextColor(button.style) },
                        button.style === 'cancel' && styles.cancelButtonText,
                      ]}
                    >
                      {button.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dialog: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 14,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  buttonContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
});
