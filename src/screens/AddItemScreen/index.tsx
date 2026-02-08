import React, { useState, useRef } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { useDatabase } from '../../contexts/DatabaseContext';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import ImagePickerButton from '../../components/ImagePickerButton';
import { saveImageLocally, getLocalImageUri } from '../../lib/filesystem';

type AddItemScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddItem'
>;
import styles from './styles';

export default function AddItemScreen() {
  const { addItemOptimistic } = useDatabase();
  const scrollViewRef = useRef<ScrollView>(null);
  const tagsInputRef = useRef<RNTextInput>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    []
  );
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);
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

      // Save images permanently
      const savedImageUris: string[] = [];
      try {
        for (const uri of images) {
          const newPath = await saveImageLocally(uri);
          savedImageUris.push(newPath);
        }
      } catch (e) {
        console.error('Failed to save images locally', e);
        Alert.alert('Error', 'Failed to save images');
        return false;
      }

      try {
        await addItemOptimistic({
          name,
          description,
          category,
          metadata: metaObj,
          tags: tagArr,
          images: savedImageUris,
        });

        // Do not block the user with an alert when multi-add is enabled.
        // The caller will decide whether to show a toast-like message or navigate back.

        setName('');
        setDescription('');
        setCategory('');
        setMetadata([]);
        setTags('');
        setImages([]);
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
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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

        <Text style={styles.sectionTitle}>Images:</Text>
        <ScrollView horizontal style={{ marginVertical: 10 }}>
          {images.map((uri, idx) => (
            <Image
              key={idx}
              source={{ uri: getLocalImageUri(uri) }}
              style={{ width: 100, height: 100, marginRight: 10, borderRadius: 8 }}
            />
          ))}
        </ScrollView>
        <ImagePickerButton onImageSelected={(uri) => setImages([...images, uri])} />

        <Text style={styles.sectionTitle}>Tags:</Text>
        <TextInput
          ref={tagsInputRef}
          style={styles.input}
          placeholder="Tags (comma-separated)"
          value={tags}
          onChangeText={setTags}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
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
                // Single add: show a confirmation and go back.
                Alert.alert('Success', 'Item added!');
                navigation.goBack();
                return;
              }

              // Multi-add: show a non-blocking toast instead of an alert
              Toast.show({
                type: 'success',
                text1: 'Saved!',
                position: 'bottom', // put it at the bottom
                visibilityTime: 1400,
                bottomOffset: 60, // distance from bottom (adjust)
              });
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
