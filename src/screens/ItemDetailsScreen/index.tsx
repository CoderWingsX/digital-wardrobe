// src/screens/ItemDetailsScreen/index.tsx

import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../../contexts/DatabaseContext';
import { loadItem } from '../../database/queries';
import { RootStackParamList, WardrobeItem } from '../../types';
import ImagePickerButton from '../../components/ImagePickerButton';
import { saveImageLocally, deleteImageLocally, getLocalImageUri } from '../../lib/filesystem';

type ItemDetailsRouteProp = RouteProp<RootStackParamList, 'ItemDetails'>;
type ItemDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ItemDetails'
>;

import styles from './styles';

/**
 * Screen to view and edit details of a specific wardrobe item.
 * Fetches item data based on the passed itemId parameter.
 * Allows editing and deleting the item.
 */
export default function ItemDetailsScreen() {
  const route = useRoute<ItemDetailsRouteProp>();
  const navigation = useNavigation<ItemDetailsNavigationProp>();
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
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);

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
    setTags((selected.tags || []).join(', '));
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
          Alert.alert('Error', 'Item not found');
          navigation.goBack();
        }
      } catch (err) {
        console.error('[db] loadItem error', err);
        Alert.alert('Error', 'Failed to load item');
        navigation.goBack();
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, items]);

  async function handleSave() {
    if (!name || !description || !category) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }

    // Convert UI state to data state
    const metaObj = Object.fromEntries(
      metadata.filter((m) => m.key).map((m) => [m.key, m.value])
    );
    const tagArr = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

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
          await deleteItemOptimistic(itemId);
          navigation.goBack();
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* Images */}
      <View style={{ marginBottom: 20 }}>
        <ScrollView horizontal style={{ marginBottom: 10 }}>
          {images.map((uri, idx) => (
            <View key={idx} style={{ marginRight: 10 }}>
              <Image
                source={{ uri: getLocalImageUri(uri) }}
                style={{ width: 200, height: 200, borderRadius: 8 }}
              />
              {isEditing && (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 12,
                    padding: 4,
                  }}
                  onPress={() => {
                    setImages(images.filter((_, i) => i !== idx));
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
        {isEditing && (
          <ImagePickerButton
            title="Add Image"
            onImageSelected={(uri) => setImages([...images, uri])}
          />
        )}
      </View>

      {/* Name */}
      {isEditing ? (
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
      ) : (
        <Text style={styles.title}>{item.name}</Text>
      )}

      {/* Category */}
      {isEditing ? (
        <TextInput
          style={styles.input}
          placeholder="Category"
          value={category}
          onChangeText={setCategory}
        />
      ) : (
        <Text style={styles.category}>{item.category}</Text>
      )}

      {/* Description */}
      {isEditing ? (
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
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
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={m.value}
                  onChangeText={(text) => updateMetadataValue(idx, text)}
                  placeholder="Value"
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
          <Text>-</Text>
        )}
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="comma-separated"
          />
        ) : item.tags.length > 0 ? (
          <Text>{item.tags.join(', ')}</Text>
        ) : (
          <Text>-</Text>
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
    </ScrollView>
  );
}
