import React, { useState, useMemo, useLayoutEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TabParamList, FilterState } from '../../types';
import { getLocalImageUri } from '../../lib/filesystem';
import EmptyState from '../../components/EmptyState';
import StyledInput from '../../components/StyledInput';
import FilterModal from '../../components/FilterModal';
import { createStyles } from './styles';
import { Ionicons } from '@expo/vector-icons';

type WardrobeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Suggestion {
    text: string;
    type: 'name' | 'category' | 'tag' | 'metadata';
    itemId?: number;
}

export default function WardrobeScreen() {
    const navigation = useNavigation<WardrobeScreenNavigationProp>();
    const { items, categories, allTags } = useDatabase();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        selectedTags: [],
        selectedCategories: [],
        sortBy: 'newest',
    });

    // Add filter button to header
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => setShowFilterModal(true)}
                    style={{ padding: 8, marginRight: 8 }}
                    accessibilityLabel="Filter"
                    accessibilityRole="button"
                >
                    <Ionicons name="filter-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, colors]);

    // Memoized filtered and sorted items
    const displayItems = useMemo(() => {
        let filtered = items;

        // Apply search query
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter((item) => {
                const nameMatch = item.name.toLowerCase().includes(lowerQuery);
                const categoryMatch = item.category.toLowerCase().includes(lowerQuery);
                const tagMatch = item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
                const metadataMatch = Object.entries(item.metadata || {}).some(
                    ([key, value]) =>
                        key.toLowerCase().includes(lowerQuery) ||
                        String(value).toLowerCase().includes(lowerQuery)
                );
                return nameMatch || categoryMatch || tagMatch || metadataMatch;
            });
        }

        // Apply category filters
        if (filters.selectedCategories.length > 0) {
            filtered = filtered.filter((item) =>
                filters.selectedCategories.includes(item.category)
            );
        }

        // Apply tag filters
        if (filters.selectedTags.length > 0) {
            filtered = filtered.filter((item) =>
                filters.selectedTags.some((tag) => item.tags.includes(tag))
            );
        }

        // Apply sorting
        const sorted = [...filtered];
        if (filters.sortBy === 'newest') {
            sorted.sort((a, b) => b.created_at - a.created_at);
        } else if (filters.sortBy === 'oldest') {
            sorted.sort((a, b) => a.created_at - b.created_at);
        } else if (filters.sortBy === 'alphabetical') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        }

        return sorted;
    }, [items, searchQuery, filters]);

    // Generate suggestions based on query
    const suggestions = useMemo(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) return [];
        const lowerQuery = searchQuery.toLowerCase();
        const result: Suggestion[] = [];
        const seen = new Set<string>();

        items.forEach((item) => {
            // Name matches (direct links)
            if (item.name.toLowerCase().includes(lowerQuery)) {
                result.push({ text: item.name, type: 'name', itemId: item.id });
            }
            // Category matches
            if (
                item.category.toLowerCase().includes(lowerQuery) &&
                !seen.has(`cat:${item.category.toLowerCase()}`)
            ) {
                result.push({ text: item.category, type: 'category' });
                seen.add(`cat:${item.category.toLowerCase()}`);
            }
            // Tag matches
            item.tags.forEach((tag) => {
                if (
                    tag.toLowerCase().includes(lowerQuery) &&
                    !seen.has(`tag:${tag.toLowerCase()}`)
                ) {
                    result.push({ text: tag, type: 'tag' });
                    seen.add(`tag:${tag.toLowerCase()}`);
                }
            });
            // Metadata matches
            Object.entries(item.metadata || {}).forEach(([key, value]) => {
                const valStr = String(value);
                if (
                    key.toLowerCase().includes(lowerQuery) &&
                    !seen.has(`meta:${key.toLowerCase()}`)
                ) {
                    result.push({ text: key, type: 'metadata' });
                    seen.add(`meta:${key.toLowerCase()}`);
                }
                if (
                    valStr.toLowerCase().includes(lowerQuery) &&
                    !seen.has(`metaval:${valStr.toLowerCase()}`)
                ) {
                    result.push({ text: valStr, type: 'metadata' });
                    seen.add(`metaval:${valStr.toLowerCase()}`);
                }
            });
        });

        return result.slice(0, 8); // Limit suggestions
    }, [items, searchQuery]);

    const handleSuggestionPress = (suggestion: Suggestion) => {
        if (suggestion.itemId) {
            navigation.navigate('ItemDetails', { itemId: suggestion.itemId });
        } else {
            setSearchQuery(suggestion.text);
        }
        setShowSuggestions(false);
        Keyboard.dismiss();
    };

    return (
        <>
            <FilterModal
                visible={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={(newFilters) => setFilters(newFilters)}
                availableTags={allTags}
                availableCategories={categories}
                currentFilters={filters}
            />
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <TouchableWithoutFeedback
                    onPress={() => {
                        setShowSuggestions(false);
                        Keyboard.dismiss();
                    }}
                >
                    <View style={styles.container}>
                        {/* Search Section */}
                        <View style={styles.searchContainer}>
                            <StyledInput
                                placeholder="Search clothes, tags, colors..."
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onSubmitEditing={() => {
                                    setShowSuggestions(false);
                                    Keyboard.dismiss();
                                }}
                                returnKeyType="search"
                                containerStyle={{ marginBottom: 0 }}
                            />

                            {showSuggestions && suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <ScrollView
                                        style={{ flex: 1 }}
                                        contentContainerStyle={{ flexGrow: 1 }}
                                        nestedScrollEnabled={true}
                                        keyboardShouldPersistTaps="handled"
                                        showsVerticalScrollIndicator={true}
                                        bounces={false}
                                    >
                                        {suggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSuggestionPress(item)}
                                            >
                                                <Text style={styles.suggestionText} numberOfLines={1}>
                                                    {item.text}
                                                </Text>
                                                <Text style={styles.suggestionType}>{item.type}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {items.length === 0 ? (
                            <EmptyState
                                icon="👗"
                                title="Your wardrobe is empty"
                                message="Start by adding your first clothing item"
                            />
                        ) : displayItems.length === 0 ? (
                            <EmptyState
                                icon="🔍"
                                title="No results found"
                                message={`No items match "${searchQuery}"`}
                            />
                        ) : (
                            <FlatList
                                style={styles.list}
                                contentContainerStyle={styles.listContent}
                                data={displayItems}
                                keyExtractor={(item) => String(item.id)}
                                scrollEnabled={!showSuggestions}
                                keyboardShouldPersistTaps="handled"
                                indicatorStyle={isDark ? 'white' : 'black'}
                                onScrollBeginDrag={() => {
                                    setShowSuggestions(false);
                                    Keyboard.dismiss();
                                }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.item}
                                        onPress={() => {
                                            setShowSuggestions(false);
                                            navigation.navigate('ItemDetails', { itemId: item.id });
                                        }}
                                        accessibilityLabel={`${item.name}, ${item.category}`}
                                        accessibilityRole="button"
                                    >
                                        {item.images && item.images.length > 0 ? (
                                            <Image
                                                source={{ uri: getLocalImageUri(item.images[0]) }}
                                                style={styles.itemImage}
                                                accessibilityLabel={`Image of ${item.name}`}
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.itemImage,
                                                    { justifyContent: 'center', alignItems: 'center' },
                                                ]}
                                            >
                                                <Text style={{ fontSize: 24 }}>👕</Text>
                                            </View>
                                        )}
                                        <View style={styles.itemContent}>
                                            <Text style={styles.title} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text style={styles.category}>{item.category}</Text>
                                            <Text style={styles.description} numberOfLines={2}>
                                                {item.description}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </>
    );
}
