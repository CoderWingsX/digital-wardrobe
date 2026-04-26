import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface StyledInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  containerStyle?: any;
}

export default function StyledInput({
  label,
  value,
  onChangeText,
  required,
  containerStyle,
  style,
  ...props
}: StyledInputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>
          {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.surface, borderColor: colors.border },
          props.multiline && { alignItems: 'flex-start', paddingTop: 5 },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            props.multiline && { height: 100, textAlignVertical: 'top', paddingTop: 8 },
            style,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
        {value && value.length > 0 && onChangeText && (
          <TouchableOpacity onPress={() => onChangeText('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: 40,
    paddingVertical: 0, // Ensure text is centered vertically
  },
});
