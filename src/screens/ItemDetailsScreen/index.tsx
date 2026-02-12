// src/screens/ItemDetailsScreen/index.tsx

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import StyledInput from '../../components/StyledInput';
import MetadataInput from '../../components/MetadataInput';
import StyledButton from '../../components/StyledButton';
import { createStyles } from './styles';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

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
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const carouselRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDeletingRef = useRef(false);

  // TODO?: Offload to SQL query with WHERE
  const { items, updateItemOptimistic, deleteItemOptimistic } =
    useDatabase();

  // Detect if form has unsaved changes (only when editing)
  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !item) return false;
    
    // Compare current form state with original item
    if (name !== item.name) return true;
    if (description !== item.description) return true;
    if (category !== item.category) return true;
    
    // Compare tags
    const originalTags = [...(item.tags || [])].sort().join(',');
    const currentTags = [...tags].sort().join(',');
    if (originalTags !== currentTags) return true;
    
    // Compare images
    const originalImages = [...(item.images || [])].sort().join(',');
    const currentImages = [...images].sort().join(',');
    if (originalImages !== currentImages) return true;
    
    // Compare metadata
    const originalMeta = JSON.stringify(
      Object.entries(item.metadata || {}).sort(([a], [b]) => a.localeCompare(b))
    );
    const currentMeta = JSON.stringify(
      metadata.filter(m => m.key).map(m => [m.key, m.value]).sort(([a], [b]) => a.localeCompare(b))
    );
    if (originalMeta !== currentMeta) return true;
    
    return false;
  }, [isEditing, item, name, description, category, tags, images, metadata]);

  // Show warning when navigating away with unsaved changes
  const { showWarningIfNeeded } = useUnsavedChangesWarning(hasUnsavedChanges);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingBottom: 10 }} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!isTagInputFocused}
          nestedScrollEnabled={true}
        >
          {/* View Mode: Show carousel first */}
          {!isEditing && images.length > 0 && (
            <View style={styles.carouselContainer}>
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
            </View>
          )}

          {/* Name */}
          {isEditing ? (
            <StyledInput
              label="Item Name"
              required
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
          ) : (
            <Text style={styles.title}>{item.name}</Text>
          )}

          {/* Description */}
          {isEditing ? (
            <StyledInput
              label="Description"
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ minHeight: 80 }}
            />
          ) : (
            <Text style={styles.description}>{item.description}</Text>
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

          {/* Metadata */}
          <Text style={styles.sectionTitle}>Metadata</Text>
          {isEditing ? (
            <>
              {metadata.map((m, idx) => (
                <MetadataInput
                  key={idx}
                  itemKey={m.key}
                  value={m.value}
                  onChangeKey={(text) => updateMetadataKey(idx, text)}
                  onChangeValue={(text) => updateMetadataValue(idx, text)}
                  onRemove={() => removeMetadataField(idx)}
                />
              ))}
              <StyledButton
                title="Add Metadata Field"
                icon="add-circle-outline"
                buttonStyle="add"
                onPress={addMetadataField}
              />
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

          {/* Images - only show in edit mode */}
          {isEditing && (
            <>
              <Text style={styles.sectionTitle}>Images</Text>
              <ScrollView horizontal style={styles.imageContainer}>
                {images.map((uri, idx) => (
                  <View key={idx} style={styles.imageWrapper}>
                    <Image
                      source={{ uri: getLocalImageUri(uri) }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.deleteImageButton}
                      onPress={() => setImages(images.filter((_, i) => i !== idx))}
                    >
                      <Text style={styles.deleteImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <ImagePickerButton
                title="Pick an Image"
                onImageSelected={(uri) => setImages([...images, uri])}
              />
            </>
          )}

          {/* Tags */}
          {isEditing ? (
            <TagInput
              tags={tags}
              onChangeTags={setTags}
              onInteractionStart={() => setIsTagInputFocused(true)}
              onInteractionEnd={() => setIsTagInputFocused(false)}
            />
          ) : (
            <>
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
            </>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {isEditing ? (
              <>
                <StyledButton
                  title="Cancel"
                  icon="close-circle-outline"
                  variant="secondary"
                  onPress={() => showWarningIfNeeded(() => {
                    setIsEditing(false);
                    if (item) populateFromItem(item);
                  })}
                />
                <StyledButton
                  title="Save"
                  icon="checkmark-circle-outline"
                  onPress={handleSave}
                />
              </>
            ) : (
              <>
                <StyledButton
                  title="Delete"
                  icon="trash-outline"
                  variant="danger"
                  onPress={handleDelete}
                />
                <StyledButton
                  title="Edit"
                  icon="create-outline"
                  onPress={() => setIsEditing(true)}
                />
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
