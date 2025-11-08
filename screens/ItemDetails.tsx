import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { loadItems, updateItem, deleteItem } from '../db';

type ItemDetailsRouteProp = RouteProp<{ params: { itemId: number } }, 'params'>;

export default function ItemDetails() {
  const route = useRoute<ItemDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { itemId } = route.params;

  const [item, setItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>([]);
  const [tags, setTags] = useState('');

  async function fetchItem() {
    const items = await loadItems();
    const selected = items.find(i => i.id === itemId);
    if (!selected) {
      Alert.alert('Error', 'Item not found');
      navigation.goBack();
      return;
    }
    setItem(selected);

    setName(selected.name);
    setDescription(selected.description);
    setCategory(selected.category);
    setMetadata(Object.entries(selected.metadata || {}).map(([k, v]) => ({ key: k, value: String(v) })));
    setTags((selected.tags || []).join(', '));
  }

  useEffect(() => {
    fetchItem();
  }, []);

  async function handleSave() {
    if (!name || !description || !category) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }

    const metaObj = Object.fromEntries(metadata.map(m => [m.key, m.value]));

    const tagArr = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    try {
      await updateItem(itemId, {
        name,
        description,
        category,
        metadata: metaObj,
        tags: tagArr,
      });

      Alert.alert('Success', 'Item updated!');
      setIsEditing(false);
      fetchItem();
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
          await deleteItem(itemId);
          navigation.goBack();
        },
      },
    ]);
  }

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

  if (!item) return <Text style={styles.loading}>Loading item...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Name */}
      {isEditing ? (
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      ) : (
        <Text style={styles.title}>{item.name}</Text>
      )}

      {/* Category */}
      {isEditing ? (
        <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
      ) : (
        <Text style={styles.category}>{item.category}</Text>
      )}

      {/* Description */}
      {isEditing ? (
        <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
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
                  onChangeText={text => updateMetadataKey(idx, text)}
                  placeholder="Key"
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={m.value}
                  onChangeText={text => updateMetadataValue(idx, text)}
                  placeholder="Value"
                />
                <Button title="X" color="red" onPress={() => removeMetadataField(idx)} />
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
            <Button title="Cancel" color="red" onPress={() => setIsEditing(false)} />
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

const styles = StyleSheet.create({
  container: { padding: 20 },
  loading: { padding: 20, fontSize: 18, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  category: { fontSize: 18, color: '#555', marginBottom: 10 },
  description: { fontSize: 16, marginBottom: 15 },
  section: { marginBottom: 15 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  metaCard: {
  padding: 10,
  borderRadius: 8,
  backgroundColor: '#eef',
  marginBottom: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  },
  metaKey: { fontWeight: 'bold', marginBottom: 2 },
  metaValue: { color: '#333' },
});
