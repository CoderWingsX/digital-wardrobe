import React, { useMemo } from 'react';
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
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../types';
import { getLocalImageUri } from '../../lib/filesystem';
import StyledButton from '../../components/StyledButton';
import { createStyles } from './styles';

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { items, categories } = useDatabase();
  const { colors } = useTheme();
  const styles = createStyles(colors);

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
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

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <StyledButton
          title="View All Items"
          icon="search-outline"
          onPress={() => navigation.navigate('Wardrobe')}
        />
      </View>
    </ScrollView>
  );
}
