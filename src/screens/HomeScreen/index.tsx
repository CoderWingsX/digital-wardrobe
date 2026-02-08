import React, { useState, useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import Toast from 'react-native-toast-message';
import { getLocalImageUri } from '../../lib/filesystem';
import EmptyState from '../../components/EmptyState';
import { createStyles } from './styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Suggestion {
  text: string;
  type: 'name' | 'category' | 'tag' | 'metadata';
  itemId?: number;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { items, refresh, clearAllOptimistic } = useDatabase();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Memoized filtered items for efficiency
  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter((item) => {
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
  }, [items, searchQuery]);

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

  async function handleClearAll() {
    if (items.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'Wardrobe is already empty',
        position: 'bottom',
      });
      return;
    }

    Alert.alert('Confirm', 'Delete all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await clearAllOptimistic();
          Toast.show({
            type: 'success',
            text1: 'All items cleared',
          });
          await refresh();
        },
      },
    ]);
  }

  return (
    <TouchableWithoutFeedback onPress={() => setShowSuggestions(false)}>
      <View style={styles.container}>
        <View style={styles.buttonRow}>
          <Button
            title="Add Item"
            onPress={() => navigation.navigate('AddItem')}
          />
          <Button title="Clear All" color="red" onPress={handleClearAll} />
        </View>

        {/* Search Section */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clothes, tags, colors..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
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
            actionLabel="Add First Item"
            onAction={() => navigation.navigate('AddItem')}
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
            data={displayItems}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={!showSuggestions}
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
  );
}
