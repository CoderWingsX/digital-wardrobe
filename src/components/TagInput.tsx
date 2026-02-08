// src/components/TagInput.tsx

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    FlatList,
    Keyboard,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { Ionicons } from '@expo/vector-icons';

interface TagInputProps {
    tags: string[];
    onChangeTags: (tags: string[]) => void;
    label?: string;
    placeholder?: string;
    onFocus?: () => void;
}

export default function TagInput({
    tags,
    onChangeTags,
    label = 'Tags',
    placeholder = 'Type to add tags...',
    onFocus,
}: TagInputProps) {
    const { colors } = useTheme();
    const { allTags } = useDatabase();
    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Filter suggestions based on input
    const suggestions = useMemo(() => {
        if (!inputText.trim()) return [];
        const lowerInput = inputText.toLowerCase();
        return allTags
            .filter(
                (t) =>
                    t.toLowerCase().startsWith(lowerInput) &&
                    !tags.some((existing) => existing.toLowerCase() === t.toLowerCase())
            )
            .slice(0, 5); // Limit suggestions
    }, [inputText, allTags, tags]);

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            onChangeTags([...tags, trimmed]);
        }
        setInputText('');
    };

    const removeTag = (tagToRemove: string) => {
        onChangeTags(tags.filter((t) => t !== tagToRemove));
    };

    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === ' ' || e.nativeEvent.key === ',') {
            addTag(inputText);
        }
    };

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}

            <View
                style={[
                    styles.inputWrapper,
                    {
                        backgroundColor: colors.surface,
                        borderColor: isFocused ? colors.primary : colors.border,
                    },
                ]}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.bubbleContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    {tags.map((tag) => (
                        <View
                            key={tag}
                            style={[styles.bubble, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}
                        >
                            <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                            <TouchableOpacity onPress={() => removeTag(tag)} style={styles.removeButton}>
                                <Ionicons name="close-circle" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={() => addTag(inputText)}
                        onKeyPress={handleKeyPress}
                        onFocus={() => {
                            setIsFocused(true);
                            onFocus?.();
                        }}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        placeholder={tags.length === 0 ? placeholder : ''}
                        placeholderTextColor={colors.textMuted}
                        blurOnSubmit={false}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </ScrollView>
            </View>

            {/* Suggestion List */}
            {isFocused && suggestions.length > 0 && (
                <View style={[styles.suggestionList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {suggestions.map((suggestion) => (
                        <TouchableOpacity
                            key={suggestion}
                            style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                            onPress={() => addTag(suggestion)}
                        >
                            <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.text }}>{suggestion}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        zIndex: 10, // Ensure suggestions are above other elements
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 50,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    bubbleContainer: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 8,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 14,
        fontWeight: '500',
    },
    removeButton: {
        marginLeft: 4,
    },
    input: {
        minWidth: 100,
        fontSize: 16,
        height: 40,
    },
    suggestionList: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 4,
        borderRadius: 8,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 100,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
});
