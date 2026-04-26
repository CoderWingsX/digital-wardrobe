// src/components/TagInput.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TAG_INPUT_SCROLL_OFFSET = 0; // No longer needed, but kept for compatibility if imported elsewhere

interface TagInputProps {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  // These props might be deprecated but kept to avoid breaking calls immediately
  onFocus?: () => void;
  containerRef?: React.RefObject<View | null>;
  onFocusChange?: (focused: boolean) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export default function TagInput({
  tags,
  onChangeTags,
  label = 'Tags',
  placeholder = 'Type to add tags...',
  onInteractionStart,
  onInteractionEnd,
}: TagInputProps) {
  const { colors } = useTheme();
  const { allTags } = useDatabase();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const mainTagScrollViewRef = useRef<ScrollView>(null);
  const modalTagScrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when tags are added
  useEffect(() => {
    setTimeout(() => {
      mainTagScrollViewRef.current?.scrollToEnd({ animated: true });
      modalTagScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [tags.length, modalVisible]); // Also scroll when modal opens

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!inputText.trim()) return [];
    const lowerInput = inputText.toLowerCase();
    return allTags
      .filter(
        (t) =>
          t.toLowerCase().startsWith(lowerInput) &&
          !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()),
      )
      .slice(0, 20); // Limit suggestions
  }, [inputText, allTags, tags]);

  const addTag = (tag: string, clearInput = true) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onChangeTags([...tags, trimmed]);
    }
    if (clearInput) {
      setInputText('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChangeTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleInputChange = (text: string) => {
    // Enforce lowercase and no spaces
    const formattedText = text.toLowerCase().replace(/\s/g, '');
    setInputText(formattedText);
  };

  return (
    <View style={styles.container}>
      {/* Main View: Label + Tags Display + Add Button */}
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <View style={styles.tagsDisplayContainer}>
        {tags.length > 0 ? (
          <View style={[styles.bubblesWrapper, { borderColor: colors.border }]}>
            <ScrollView
              ref={mainTagScrollViewRef}
              nestedScrollEnabled={true}
              style={styles.bubbleScroll}
              contentContainerStyle={styles.bubbleContainer}
              onContentSizeChange={() =>
                mainTagScrollViewRef.current?.scrollToEnd({ animated: true })
              }
              onTouchStart={onInteractionStart}
              onTouchEnd={onInteractionEnd}
              onMomentumScrollEnd={onInteractionEnd}
            >
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.displayBubble,
                    { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, marginBottom: 8 }}>No tags selected</Text>
        )}

        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add / Edit Tags</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for Editing Tags */}
      <Modal
        animationType="slide"
        transparent={false} // Full screen modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)} // Android back button
        presentationStyle="pageSheet" // iOS card style
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Tags</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.doneButtonText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16 }}
            >
              {/* Input Field */}
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                ADD NEW TAG
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={inputText}
                  onChangeText={handleInputChange}
                  onSubmitEditing={() => addTag(inputText)}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                />
                {inputText.length > 0 && (
                  <TouchableOpacity onPress={() => setInputText('')}>
                    <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, marginLeft: 4 }}>
                Spaces not allowed (special characters okay). Press Enter to add.
              </Text>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text
                    style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 16 }]}
                  >
                    SUGGESTIONS
                  </Text>
                  <ScrollView
                    horizontal
                    keyboardShouldPersistTaps="always"
                    style={{ marginTop: 8 }}
                  >
                    {suggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        style={[
                          styles.suggestionBubble,
                          { borderColor: colors.border, backgroundColor: colors.surface },
                        ]}
                        onPress={() => addTag(suggestion, false)}
                      >
                        <Ionicons
                          name="add"
                          size={14}
                          color={colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={{ color: colors.text }}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Current Selected Tags (with Remove option) */}
              <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 24 }]}>
                SELECTED TAGS
              </Text>
              <View style={[styles.bubblesWrapper, { borderColor: colors.border }]}>
                <ScrollView
                  ref={modalTagScrollViewRef}
                  nestedScrollEnabled={true}
                  style={styles.bubbleScroll}
                  contentContainerStyle={styles.bubbleContainer}
                  onContentSizeChange={() =>
                    modalTagScrollViewRef.current?.scrollToEnd({ animated: true })
                  }
                >
                  {tags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.bubble,
                        {
                          backgroundColor: colors.primary + '20',
                          borderColor: colors.primary + '40',
                        },
                      ]}
                      onPress={() => removeTag(tag)}
                    >
                      <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={colors.primary}
                        style={styles.removeIcon}
                      />
                    </TouchableOpacity>
                  ))}
                  {tags.length === 0 && (
                    <Text style={{ color: colors.textMuted, fontStyle: 'italic', padding: 8 }}>
                      No tags selected yet.
                    </Text>
                  )}
                </ScrollView>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsDisplayContainer: {
    flexDirection: 'column',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  bubblesWrapper: {
    maxHeight: 150, // Approx 4 rows
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
  displayBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8, // Slightly larger touch area for removal
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeIcon: {
    marginLeft: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
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
  },
  suggestionsContainer: {
    // marginTop: 8
  },
  suggestionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
});
