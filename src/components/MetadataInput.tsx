import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface MetadataInputProps {
    itemKey: string;
    value: string;
    onChangeKey: (text: string) => void;
    onChangeValue: (text: string) => void;
    onRemove: () => void;
}

export default function MetadataInput({
    itemKey,
    value,
    onChangeKey,
    onChangeValue,
    onRemove,
}: MetadataInputProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Key Input */}
            <TextInput
                style={[styles.input, { color: colors.text }]}
                value={itemKey}
                onChangeText={onChangeKey}
                placeholder="Key"
                placeholderTextColor={colors.textMuted}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Value Input */}
            <TextInput
                style={[styles.input, { color: colors.text, flex: 2 }]}
                value={value}
                onChangeText={onChangeValue}
                placeholder="Value"
                placeholderTextColor={colors.textMuted}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Remove Button */}
            <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 50,
        marginBottom: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: 40,
        paddingHorizontal: 12,
    },
    divider: {
        width: 1,
        height: '60%',
    },
    removeButton: {
        padding: 12,
    },
});
