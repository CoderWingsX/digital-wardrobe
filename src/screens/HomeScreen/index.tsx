import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, WardrobeItem } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { getLocalImageUri } from '../../lib/filesystem';
import StyledButton from '../../components/StyledButton';
import { createStyles } from './styles';
import { Ionicons } from '@expo/vector-icons';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { items, categories } = useDatabase();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [shuffledPair, setShuffledPair] = useState<{ top?: WardrobeItem, bottom?: WardrobeItem }>({});

  const performShuffle = useCallback(() => {
    if (items.length < 2) return;

    // A bit of logic to guess what's a top and what's a bottom
    const tops = items.filter(i =>
      ['top', 'shirt', 't-shirt', 'jacket', 'coat', 'sweatshirt', 'hoodie'].some(word => i.category.toLowerCase().includes(word))
    );
    const bottoms = items.filter(i =>
      ['bottom', 'pants', 'trousers', 'shorts', 'skirt', 'jeans'].some(word => i.category.toLowerCase().includes(word))
    );

    let randomTop, randomBottom;

    if (tops.length > 0) {
      randomTop = tops[Math.floor(Math.random() * tops.length)];
    } else {
      randomTop = items[Math.floor(Math.random() * items.length)];
    }

    if (bottoms.length > 0) {
      randomBottom = bottoms.filter(b => b.id !== randomTop?.id)[Math.floor(Math.random() * bottoms.length)];
    } else {
      randomBottom = items.filter(b => b.id !== randomTop?.id)[Math.floor(Math.random() * items.length)];
    }

    setShuffledPair({ top: randomTop, bottom: randomBottom });
  }, [items]);

  useEffect(() => {
    if (items.length >= 2 && !shuffledPair.top) {
      performShuffle();
    }
  }, [items, shuffledPair, performShuffle]);

  // Get recently added items (last 4)
  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 4);
  }, [items]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(' • ');
  }, [items]);

  const renderShuffleItem = (item?: WardrobeItem, label?: string) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        style={styles.shuffleCard}
        onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
      >
        <View style={styles.shuffleImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: getLocalImageUri(item.images[0]) }}
              style={styles.shuffleImage}
            />
          ) : (
            <View style={styles.shufflePlaceholder}>
              <Text style={{ fontSize: 32 }}>👕</Text>
            </View>
          )}
          <View style={styles.shuffleLabelBadge}>
            <Text style={styles.shuffleLabelText}>{label}</Text>
          </View>
        </View>
        <Text style={styles.shuffleItemName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const fashionQuote = useMemo(() => {
    const quotes = [
      "I have enough clothes and shoes. I don't need to go shopping. — Said no one ever.",
      "Style is a way to say who you are without having to speak. — Rachel Zoe",
      "Life is too short to wear boring clothes.",
      "I'm not a shopaholic, I'm helping the economy.",
      "Clothes mean nothing until someone lives in them. — Marc Jacobs",
      "Elegance is the only beauty that never fades. — Audrey Hepburn",
      "Buy less, choose well, and do it yourself! — Vivienne Westwood"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Recently Added Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recently Added</Text>
        {recentItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentItemsContainer}
          >
            {recentItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentItem}
                onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
              >
                {item.images && item.images.length > 0 ? (
                  <Image
                    source={{ uri: getLocalImageUri(item.images[0]) }}
                    style={styles.recentItemImage}
                  />
                ) : (
                  <View style={styles.recentItemPlaceholder}>
                    <Text style={{ fontSize: 32 }}>👕</Text>
                  </View>
                )}
                <Text style={styles.recentItemName} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No items yet</Text>
        )}
      </View>

      {/* Quick Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Items</Text>
            <Text style={styles.statValue}>{items.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Categories</Text>
            <Text style={styles.statValue}>{categories.length}</Text>
          </View>
          {categoryBreakdown && (
            <Text style={styles.categoryBreakdown}>{categoryBreakdown}</Text>
          )}
        </View>
      </View>

      {/* Style Shuffle Section (Only if 2+ items) OR Quote */}
      <View style={styles.section}>
        {items.length >= 2 ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Style Shuffle</Text>
              <TouchableOpacity
                style={styles.shuffleButton}
                onPress={performShuffle}
              >
                <Ionicons name="shuffle" size={20} color={colors.primary} />
                <Text style={styles.shuffleButtonText}>Shuffle</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.shuffleContainer}>
              {renderShuffleItem(shuffledPair.top, 'Top')}
              <View style={styles.shufflePlus}>
                <Ionicons name="add" size={24} color={colors.textSecondary} />
              </View>
              {renderShuffleItem(shuffledPair.bottom, 'Bottom')}
            </View>
          </>
        ) : (
          <View style={[styles.statsContainer, { paddingVertical: 24, alignItems: 'center' }]}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={{
              color: colors.text,
              fontSize: 16,
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: 24,
              paddingHorizontal: 20
            }}>
              "{fashionQuote}"
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
