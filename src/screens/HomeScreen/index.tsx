// src/screens/HomeScreen/index.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { loadItems, addItem, clearAll } from '../../database/queries';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, WardrobeItem } from '../../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
import styles from './styles';

export default function HomeScreen() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Refactored to handle structured data, not strings
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    []
  );
  const [tags, setTags] = useState(''); // Keep tags as simple comma-separated string for input

  const navigation = useNavigation<HomeScreenNavigationProp>();

  async function refreshItems() {
    console.log('Refreshing…');
    const data = await loadItems();
    console.log('Loaded:', data);
    setItems(data);
  }

  // Initial load
  useEffect(() => {
    refreshItems();
  }, []);

  // Refresh on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshItems();
    });
    return unsubscribe;
  }, [navigation]);

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const updateMetadata = (index: number, key: string, value: string) => {
    const newMeta = [...metadata];
    newMeta[index] = { key, value };
    setMetadata(newMeta);
  };

  async function handleAddItem() {
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
      await addItem({
        name,
        description,
        category,
        metadata: metaObj,
        tags: tagArr,
      });

      Alert.alert('Success', 'Item added!');

      // Clear form
      setName('');
      setDescription('');
      setCategory('');
      setMetadata([]);
      setTags('');

      await refreshItems();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to add item');
    }
  }

  async function handleClearAll() {
    Alert.alert('Confirm', 'Delete all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          console.log('Items Cleared.');
          await refreshItems();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Item Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={styles.input}
          placeholder="Category"
          value={category}
          onChangeText={setCategory}
        />

        <Text style={styles.sectionTitle}>Metadata:</Text>
        {metadata.map((m, idx) => (
          <View key={idx} style={styles.metaRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 5 }]}
              value={m.key}
              onChangeText={(text) => updateMetadata(idx, text, m.value)}
              placeholder="Key"
            />
            <TextInput
              style={[styles.input, { flex: 2 }]}
              value={m.value}
              onChangeText={(text) => updateMetadata(idx, m.key, text)}
              placeholder="Value"
            />
          </View>
        ))}
        <Button title="+ Add Metadata Field" onPress={addMetadataField} />

        <Text style={styles.sectionTitle}>Tags:</Text>
        <TextInput
          style={styles.input}
          placeholder="Tags (comma-separated)"
          value={tags}
          onChangeText={setTags}
        />

        <View style={styles.buttonRow}>
          <Button title="Add Item" onPress={handleAddItem} />
          <Button title="Clear All" color="red" onPress={handleClearAll} />
        </View>
      </ScrollView>

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              navigation.navigate('ItemDetails', { itemId: item.id })
            }
          >
            <Text style={styles.title}>{item.name}</Text>
            <Text>{item.category}</Text>
            <Text>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
