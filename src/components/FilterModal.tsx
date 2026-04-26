// src/components/FilterModal.tsx

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FilterState } from '../types';
import StyledButton from './StyledButton';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  availableTags: string[];
  availableCategories: string[];
  currentFilters: FilterState;
}

export default function FilterModal({
  visible,
  onClose,
  onApply,
  availableTags,
  availableCategories,
  currentFilters,
}: FilterModalProps) {
  const { colors } = useTheme();
  const [selectedTags, setSelectedTags] = useState<string[]>(currentFilters.selectedTags);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters.selectedCategories,
  );
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>(currentFilters.sortBy);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleApply = () => {
    onApply({ selectedTags, selectedCategories, sortBy });
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {
      selectedTags: [],
      selectedCategories: [],
      sortBy: 'newest' as const,
    };
    setSelectedTags([]);
    setSelectedCategories([]);
    setSortBy('newest');
    onApply(clearedFilters);
    onClose();
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBackground,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    tagSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagText: {
      fontSize: 14,
      color: colors.text,
    },
    tagTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    sortOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortOptionText: {
      fontSize: 15,
      color: colors.text,
      marginLeft: 12,
    },
    sortOptionTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filter & Sort</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            {availableCategories.length > 0 ? (
              <View style={styles.tagContainer}>
                {availableCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.tag,
                      selectedCategories.includes(category) && styles.tagSelected,
                    ]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedCategories.includes(category) && styles.tagTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No categories available</Text>
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            {availableTags.length > 0 ? (
              <View style={styles.tagContainer}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No tags available</Text>
            )}
          </View>

          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            {(['newest', 'oldest', 'alphabetical'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.sortOption, sortBy === option && styles.sortOptionSelected]}
                onPress={() => setSortBy(option)}
              >
                <Ionicons
                  name={sortBy === option ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={sortBy === option ? '#fff' : colors.text}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option && styles.sortOptionTextSelected,
                  ]}
                >
                  {option === 'newest' && 'Newest First'}
                  {option === 'oldest' && 'Oldest First'}
                  {option === 'alphabetical' && 'Alphabetical'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <StyledButton title="Clear" variant="secondary" onPress={handleClear} />
          </View>
          <View style={{ flex: 1 }}>
            <StyledButton title="Apply" onPress={handleApply} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
