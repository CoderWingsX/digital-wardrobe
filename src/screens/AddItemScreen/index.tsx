import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Switch,
} from 'react-native';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, WardrobeItem } from '../../types';

type AddItemScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddItem'
>;
import styles from './styles';

export default function AddItemScreen() {
  const { addItemOptimistic } = useDatabase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    []
  );
  const [tags, setTags] = useState('');
  const [multiAdd, setMultiAdd] = useState(false);

  const navigation = useNavigation<AddItemScreenNavigationProp>();

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const removeMetadataField = (idx: number) => {
    const newMeta = [...metadata];
    newMeta.splice(idx, 1);
    setMetadata(newMeta);
  };

  const updateMetadata = (index: number, key: string, value: string) => {
    const newMeta = [...metadata];
    newMeta[index] = { key, value };
    setMetadata(newMeta);
  };

  async function handleAddItem() {
    if (!name || !description || !category) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return false;
    }

    try {
      const metaObj = Object.fromEntries(
        metadata.filter((m) => m.key).map((m) => [m.key, m.value])
      );
      const tagArr = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      try {
        await addItemOptimistic({
          name,
          description,
          category,
          metadata: metaObj,
          tags: tagArr,
        });

        Alert.alert('Success', 'Item added!');

        setName('');
        setDescription('');
        setCategory('');
        setMetadata([]);
        setTags('');
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to add item');
      }
      return true;
    } catch {
      return false;
    }
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
            <Button
              title="X"
              color="red"
              onPress={() => removeMetadataField(idx)}
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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 10,
          }}
        >
          <Switch value={multiAdd} onValueChange={setMultiAdd} />
          <Text style={{ marginLeft: 10 }}>Add multiple items</Text>
        </View>
        <View style={styles.buttonRow}>
          <Button
            title="Save Item"
            onPress={async () => {
              const result = await handleAddItem();

              if (!result) return; // if validation failed

              if (!multiAdd) {
                navigation.goBack();
              }

              // If multi-add ON, fields get cleared inside handleAddItem anyway
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
