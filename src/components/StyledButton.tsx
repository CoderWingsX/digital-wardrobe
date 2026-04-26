import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger';
  buttonStyle?: 'add' | 'action'; // 'add' = dashed border, 'action' = solid border
  style?: ViewStyle;
}

export default function StyledButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  buttonStyle = 'action',
  style,
}: StyledButtonProps) {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'danger':
        return { color: colors.danger || '#ff3b30', borderColor: colors.danger || '#ff3b30' };
      case 'secondary':
        return { color: colors.textMuted, borderColor: colors.border };
      default:
        return { color: colors.primary, borderColor: colors.border };
    }
  };

  const { color, borderColor } = getColors();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.surface, borderColor },
        buttonStyle === 'add' ? styles.dashedButton : styles.solidButton,
        style,
      ]}
      onPress={onPress}
    >
      {icon && <Ionicons name={icon} size={20} color={color} />}
      <Text style={[styles.buttonText, { color }, icon && { marginLeft: 8 }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'stretch', // Full width
  },
  dashedButton: {
    borderStyle: 'dashed',
  },
  solidButton: {
    borderStyle: 'solid',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
