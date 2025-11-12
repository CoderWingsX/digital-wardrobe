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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../../contexts/DatabaseContext';
import { RootStackParamList, WardrobeItem } from '../../types';

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
  }

  useEffect(() => {
    const selected = items.find((i) => i.id === itemId);
    if (selected) {
      populateFromItem(selected);
    } else {
      // try refreshing once to load from DB
      (async () => {
        await refresh();
        const s = items.find((i) => i.id === itemId);
        if (s) populateFromItem(s);
        else {
          Alert.alert('Error', 'Item not found');
          navigation.goBack();
        }
      })();
    }
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

    try {
      await updateItemOptimistic(itemId, {
        name,
        description,
        category,
        metadata: metaObj,
        tags: tagArr,
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
              onPress={() => setIsEditing(false)}
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
