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
    TouchableWithoutFeedback,
    Pressable,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { Ionicons } from '@expo/vector-icons';

export const TAG_INPUT_SCROLL_OFFSET = 40;

interface TagInputProps {
    tags: string[];
    onChangeTags: (tags: string[]) => void;
    label?: string;
    placeholder?: string;
    onFocus?: () => void;
    containerRef?: React.RefObject<View | null>;
    onFocusChange?: (focused: boolean) => void;
}

export default function TagInput({
    tags,
    onChangeTags,
    label = 'Tags',
    placeholder = 'Type to add tags...',
    onFocus,
    containerRef,
    onFocusChange,
}: TagInputProps) {
    const { colors } = useTheme();
    const { allTags } = useDatabase();
    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const tagScrollViewRef = React.useRef<ScrollView>(null);

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
            .slice(0, 20); // Limit suggestions
    }, [inputText, allTags, tags]);

    // Notify parent about focus state
    React.useEffect(() => {
        onFocusChange?.(isFocused);
    }, [isFocused, onFocusChange]);

    // Reliable auto-scroll to bottom when tags are added
    React.useEffect(() => {
        // Use a small timeout to ensure layout has updated
        setTimeout(() => {
            tagScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [tags.length]);

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

    const handleInputChange = (text: string) => {
        // If the last character is a space or comma, add the tag and CLEAR the input
        if (text.endsWith(' ') || text.endsWith(',')) {
            const tagToAdd = text.slice(0, -1);
            if (tagToAdd.trim()) {
                addTag(tagToAdd);
            }
            setInputText(''); // Explicitly clear
            return;
        }
        setInputText(text);
    };

    const handleKeyPress = (e: any) => {
        // Keep handleKeyPress for other behaviors if needed, 
        // but handleInputChange now handles space/comma to ensure clearing
        if (e.nativeEvent.key === 'Enter') {
            addTag(inputText);
        }
    };

    return (
        <View style={styles.container} ref={containerRef}>
            {label && (
                <Pressable onPress={() => Keyboard.dismiss()}>
                    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                </Pressable>
            )}

            {tags.length > 0 && (
                <View style={[styles.bubblesWrapper, { borderColor: colors.border }]}>
                    <ScrollView
                        ref={tagScrollViewRef}
                        horizontal={false}
                        style={styles.bubbleScroll}
                        contentContainerStyle={styles.bubbleContainer}
                        nestedScrollEnabled={true}
                        keyboardDismissMode="none"
                        keyboardShouldPersistTaps="always"
                        onContentSizeChange={() => tagScrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        {tags.map((tag) => (
                            <View
                                key={tag}
                                style={[
                                    styles.bubble,
                                    {
                                        backgroundColor: colors.primary + '20',
                                        borderColor: colors.primary + '40',
                                    },
                                ]}
                            >
                                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                                <TouchableOpacity onPress={() => removeTag(tag)} style={styles.removeButton}>
                                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View
                style={[
                    styles.inputWrapper,
                    {
                        backgroundColor: colors.surface,
                        borderColor: isFocused ? colors.primary : colors.border,
                    },
                ]}
            >
                <TextInput
                    style={[styles.input, { color: colors.text, flex: 1 }]}
                    value={inputText}
                    onChangeText={handleInputChange}
                    onSubmitEditing={() => addTag(inputText)}
                    onKeyPress={handleKeyPress}
                    onFocus={() => {
                        setIsFocused(true);
                        onFocus?.();
                    }}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    blurOnSubmit={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {isFocused && (
                    <TouchableOpacity
                        onPress={() => Keyboard.dismiss()}
                        style={styles.dismissButton}
                    >
                        <Ionicons name="chevron-down-circle" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Suggestion List */}
            {isFocused && suggestions.length > 0 && (
                <ScrollView
                    style={[styles.suggestionList, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode="none"
                    nestedScrollEnabled={true}
                >
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
                </ScrollView>
            )}

            {/* Spacer for keyboard visibility - interactive to dismiss keyboard */}
            {isFocused && (
                <Pressable
                    onPress={() => Keyboard.dismiss()}
                    style={{ height: 200 }}
                />
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
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 50,
        paddingHorizontal: 12,
    },
    bubblesWrapper: {
        maxHeight: 85,
        marginBottom: 8,
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
    },
    bubbleScroll: {
        flexGrow: 0,
    },
    bubbleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: 4,
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
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
        fontSize: 16,
        height: 40,
    },
    suggestionList: {
        marginTop: 8,
        borderRadius: 8,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 100,
        overflow: 'hidden',
        maxHeight: 215, // Exactly 5 rows (~43px each)
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    dismissButton: {
        marginLeft: 8,
        padding: 4,
    },
});
