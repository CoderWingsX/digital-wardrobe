// src/screens/ItemDetailsScreen/index.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Button,
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
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme } from '../../contexts/ThemeContext';
import { loadItem } from '../../database/queries';
import { RootStackParamList, WardrobeItem } from '../../types';
import ImagePickerButton from '../../components/ImagePickerButton';
import { saveImageLocally, deleteImageLocally, getLocalImageUri } from '../../lib/filesystem';
import ImageViewer from 'react-native-image-zoom-viewer';
import CategoryPicker from '../../components/CategoryPicker';
import TagInput from '../../components/TagInput';
import { createStyles } from './styles';

type ItemDetailsRouteProp = RouteProp<RootStackParamList, 'ItemDetails'>;
type ItemDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ItemDetails'
>;

/**
 * Screen to view and edit details of a specific wardrobe item.
 * Fetches item data based on the passed itemId parameter.
 * Allows editing and deleting the item.
 */
export default function ItemDetailsScreen() {
  const route = useRoute<ItemDetailsRouteProp>();
  const navigation = useNavigation<ItemDetailsNavigationProp>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { itemId } = route.params;

  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    []
  );
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDeletingRef = useRef(false);

  // TODO?: Offload to SQL query with WHERE
  const { items, refresh, updateItemOptimistic, deleteItemOptimistic } =
    useDatabase();

  function populateFromItem(selected: WardrobeItem) {
    setItem(selected);
    setName(selected.name);
    setDescription(selected.description);
    setCategory(selected.category);
    setMetadata(
      Object.entries(selected.metadata || {}).map(([k, v]) => ({
        key: k,
        value: String(v),
      }))
    );
    setTags(selected.tags || []);
    setImages(selected.images || []);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Prefer the in-memory item if available for instant display
      const selected = items.find((i) => i.id === itemId);
      if (selected) {
        if (mounted) populateFromItem(selected);
        return;
      }

      // Fall back to a targeted DB fetch to avoid reloading the whole list
      try {
        const loaded = await loadItem(itemId);
        if (loaded) {
          if (mounted) populateFromItem(loaded);
        } else {
          // If we are currently deleting this item, let handleDelete handle navigation
          if (isDeletingRef.current) return;

          Alert.alert('Error', 'Item not found');
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      } catch (err) {
        console.error('[db] loadItem error', err);
        if (isDeletingRef.current) return;
        Alert.alert('Error', 'Failed to load item');
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, items]);

  async function handleSave() {
    if (!name || !category) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }

    // Convert UI state to data state
    const metaObj = Object.fromEntries(
      metadata.filter((m) => m.key).map((m) => [m.key, m.value])
    );
    const tagArr = tags;

    const finalImageUris: string[] = [];
    try {
      // 1. Process new images
      for (const uri of images) {
        if (item?.images?.includes(uri)) {
          finalImageUris.push(uri);
        } else {
          // It's a new temporary URI, save it
          const savedPath = await saveImageLocally(uri);
          finalImageUris.push(savedPath);
        }
      }

      // 2. Cleanup deleted images (optional but good)
      if (item?.images) {
        const deleted = item.images.filter((old) => !images.includes(old));
        for (const d of deleted) {
          await deleteImageLocally(d);
        }
      }
    } catch (e) {
      console.error('Error processing images', e);
      Alert.alert('Error', 'Failed to save images');
      return;
    }

    try {
      await updateItemOptimistic(itemId, {
        name,
        description,
        category,
        metadata: metaObj,
        tags: tagArr,
        images: finalImageUris,
      });

      Alert.alert('Success', 'Item updated!');
      setIsEditing(false);
      // refresh will be performed by optimistic helper
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update item');
    }
  }

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
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          } catch (err) {
            isDeletingRef.current = false;
            console.error('Delete failed', err);
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  }

  // --- Metadata field handlers ---
  const updateMetadataKey = (idx: number, key: string) => {
    const newMeta = [...metadata];
    newMeta[idx].key = key;
    setMetadata(newMeta);
  };

  const updateMetadataValue = (idx: number, value: string) => {
    const newMeta = [...metadata];
    newMeta[idx].value = value;
    setMetadata(newMeta);
  };

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const removeMetadataField = (idx: number) => {
    const newMeta = [...metadata];
    newMeta.splice(idx, 1);
    setMetadata(newMeta);
  };
  // ---

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>Loading item...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Images Carousel */}
          <View style={styles.carouselContainer}>
            {images.length > 0 && (
              <>
                <FlatList
                  ref={carouselRef}
                  data={images}
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
                      {isEditing && (
                        <TouchableOpacity
                          style={styles.deleteImageButton}
                          onPress={() => {
                            setImages(images.filter((_, i) => i !== idx));
                          }}
                        >
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
                {/* Pagination Dots */}
                {images.length > 1 && (
                  <View style={styles.paginationContainer}>
                    {images.map((_, idx) => (
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
              </>
            )}
            {isEditing && (
              <ImagePickerButton
                title="Add Image"
                onImageSelected={(uri) => setImages([...images, uri])}
              />
            )}
          </View>

          {/* Name */}
          {isEditing ? (
            <>
              <Text style={styles.label}>
                Item Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </>
          ) : (
            <Text style={styles.title}>{item.name}</Text>
          )}

          {/* Category */}
          {isEditing ? (
            <CategoryPicker
              value={category}
              onSelect={setCategory}
              required
            />
          ) : (
            <Text style={styles.category}>{item.category}</Text>
          )}

          {/* Description */}
          {isEditing ? (
            <>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </>
          ) : (
            <Text style={styles.description}>{item.description}</Text>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metadata:</Text>
            {isEditing ? (
              <>
                {metadata.map((m, idx) => (
                  <View key={idx} style={styles.metaRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 5 }]}
                      value={m.key}
                      onChangeText={(text) => updateMetadataKey(idx, text)}
                      placeholder="Key"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.input, { flex: 2 }]}
                      value={m.value}
                      onChangeText={(text) => updateMetadataValue(idx, text)}
                      placeholder="Value"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Button
                      title="X"
                      color="red"
                      onPress={() => removeMetadataField(idx)}
                    />
                  </View>
                ))}
                <Button title="+ Add Field" onPress={addMetadataField} />
              </>
            ) : Object.keys(item.metadata).length > 0 ? (
              Object.entries(item.metadata).map(([k, v]) => (
                <View key={k} style={styles.metaCard}>
                  <Text style={styles.metaKey}>{k}</Text>
                  <Text style={styles.metaValue}>{String(v)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>-</Text>
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags:</Text>
            {isEditing ? (
              <TagInput
                tags={tags}
                onChangeTags={setTags}
                label=""
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            ) : item.tags.length > 0 ? (
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
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {isEditing ? (
              <>
                <Button title="Save" onPress={handleSave} />
                <Button
                  title="Cancel"
                  color="grey"
                  onPress={() => {
                    setIsEditing(false);
                    if (item) populateFromItem(item);
                  }}
                />
              </>
            ) : (
              <>
                <Button title="Edit" onPress={() => setIsEditing(true)} />
                <Button title="Delete" color="red" onPress={handleDelete} />
              </>
            )}
          </View>

          {/* Full-Screen Image Modal */}
          <Modal
            visible={fullScreenImageIndex !== null}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setFullScreenImageIndex(null)}
          >
            <ImageViewer
              imageUrls={images.map(uri => ({
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
