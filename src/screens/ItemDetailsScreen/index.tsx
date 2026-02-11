// src/screens/ItemDetailsScreen/index.tsx

import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList, WardrobeItem } from '../../types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getLocalImageUri } from '../../lib/filesystem';
import ImageViewer from 'react-native-image-zoom-viewer';
import StyledButton from '../../components/StyledButton';
import { createStyles } from './styles';

type ItemDetailsRouteProp = RouteProp<RootStackParamList, 'ItemDetails'>;
type ItemDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'ItemDetails'>;

export default function ItemDetailsScreen() {
  const route = useRoute<ItemDetailsRouteProp>();
  const navigation = useNavigation<ItemDetailsNavigationProp>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const itemId = route.params?.itemId;

  const { items, deleteItemOptimistic } = useDatabase();

  const item = useMemo(() => items.find(i => i.id === itemId), [items, itemId]);

  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    if (!item && !isDeletingRef.current) {
      navigation.goBack();
    }
  }, [item, navigation]);

  async function handleDelete() {
    Alert.alert('Confirm', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          isDeletingRef.current = true;
          try {
            await deleteItemOptimistic(itemId);
            navigation.goBack();
          } catch (err) {
            isDeletingRef.current = false;
            console.error('Delete failed', err);
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  }

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loading}>Loading item...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { paddingBottom: 40 }]}
      >
        {/* Carousel */}
        {item.images.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={carouselRef}
              data={item.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={Dimensions.get('window').width - 40}
              decelerationRate="fast"
              onScroll={(event) => {
                const slideSize = Dimensions.get('window').width - 40;
                const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
                setActiveCarouselIndex(index);
              }}
              scrollEventThrottle={16}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item: uri, index: idx }) => (
                <View style={styles.carouselSlide}>
                  <TouchableOpacity
                    onPress={() => setFullScreenImageIndex(idx)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: getLocalImageUri(uri) }}
                      style={styles.carouselImage}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {/* Pagination Dots */}
            {item.images.length > 1 && (
              <View style={styles.paginationContainer}>
                {item.images.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.paginationDot,
                      idx === activeCarouselIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Info */}
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        {/* Metadata */}
        <Text style={styles.sectionTitle}>Metadata</Text>
        {Object.keys(item.metadata).length > 0 ? (
          Object.entries(item.metadata).map(([k, v]) => (
            <View key={k} style={styles.metaCard}>
              <Text style={styles.metaKey}>{k}</Text>
              <Text style={styles.metaValue}>{String(v)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>-</Text>
        )}

        {/* Tags */}
        <Text style={styles.sectionTitle}>Tags</Text>
        {item.tags.length > 0 ? (
          <View style={styles.tagContainer}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagBubble}>
                <Text style={styles.tagBubbleText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>-</Text>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <StyledButton
            title="Delete"
            icon="trash-outline"
            variant="danger"
            onPress={handleDelete}
          />
          <StyledButton
            title="Edit"
            icon="create-outline"
            onPress={() => navigation.navigate('AddItem', { item })}
          />
        </View>

        {/* Full-Screen Image Modal */}
        <Modal
          visible={fullScreenImageIndex !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullScreenImageIndex(null)}
        >
          <ImageViewer
            imageUrls={item.images.map(uri => ({
              url: getLocalImageUri(uri),
            }))}
            index={fullScreenImageIndex ?? 0}
            enableSwipeDown={true}
            onSwipeDown={() => setFullScreenImageIndex(null)}
            onClick={() => setFullScreenImageIndex(null)}
            backgroundColor="rgba(0, 0, 0, 0.95)"
            saveToLocalByLongPress={false}
            renderIndicator={(currentIndex, allSize) => (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentIndex}/{allSize}
                </Text>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullScreenImageIndex(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
