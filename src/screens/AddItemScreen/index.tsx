import React, { useState, useRef, useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useTheme } from '../../contexts/ThemeContext';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import ImagePickerButton from '../../components/ImagePickerButton';
import { saveImageLocally, getLocalImageUri } from '../../lib/filesystem';
import CategoryPicker from '../../components/CategoryPicker';
import TagInput from '../../components/TagInput';
import StyledInput from '../../components/StyledInput';
import MetadataInput from '../../components/MetadataInput';
import StyledButton from '../../components/StyledButton';
import { createStyles } from './styles';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

type AddItemScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddItem'
>;

export default function AddItemScreen() {
  const { addItemOptimistic } = useDatabase();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollViewRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    [
      { key: 'Color', value: '' },
      { key: 'Size', value: '' },
      { key: 'Brand', value: '' },
      { key: 'Material', value: '' },
    ]
  );
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [multiAdd, setMultiAdd] = useState(false);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);

  const navigation = useNavigation<AddItemScreenNavigationProp>();

  // Detect if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (name.trim() !== '') return true;
    if (description.trim() !== '') return true;
    if (category !== '') return true;
    if (images.length > 0) return true;
    if (tags.length > 0) return true;
    // Check if any metadata has non-empty values
    if (metadata.some(m => m.value.trim() !== '')) return true;
    return false;
  }, [name, description, category, images, tags, metadata]);

  // Show warning when navigating away with unsaved changes
  const { showWarningIfNeeded } = useUnsavedChangesWarning(hasUnsavedChanges);

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

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  async function handleAddItem() {
    if (!name || !category) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return false;
    }

    try {
      const metaObj = Object.fromEntries(
        metadata
          .filter((m) => m.key && m.value.trim() !== '') // Filter out empty values
          .map((m) => [m.key, m.value])
      );
      const tagArr = tags;

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
        setMetadata([
          { key: 'Color', value: '' },
          { key: 'Size', value: '' },
          { key: 'Brand', value: '' },
          { key: 'Material', value: '' },
        ]);
        setTags([]);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingBottom: 10 }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!isTagInputFocused}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled={true}
        >
          <StyledInput
            label="Item Name"
            required
            placeholder="Enter item name"
            value={name}
            onChangeText={setName}
          />

          <StyledInput
            label="Description"
            placeholder="Enter description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <CategoryPicker
            value={category}
            onSelect={setCategory}
            required
          />

          <Text style={styles.sectionTitle}>Metadata</Text>
          {metadata.map((m, idx) => (
            <MetadataInput
              key={idx}
              itemKey={m.key}
              value={m.value}
              onChangeKey={(text) => updateMetadata(idx, text, m.value)}
              onChangeValue={(text) => updateMetadata(idx, m.key, text)}
              onRemove={() => removeMetadataField(idx)}
            />
          ))}
          <StyledButton
            title="Add Metadata Field"
            icon="add-circle-outline"
            buttonStyle="add"
            onPress={addMetadataField}
          />

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
                  onPress={() => removeImage(idx)}
                >
                  <Text style={styles.deleteImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <ImagePickerButton onImageSelected={(uri) => setImages([...images, uri])} />

          <TagInput
            tags={tags}
            onChangeTags={setTags}
            onInteractionStart={() => setIsTagInputFocused(true)}
            onInteractionEnd={() => setIsTagInputFocused(false)}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 10,
            }}
          >
            <Switch value={multiAdd} onValueChange={setMultiAdd} />
            <Text style={{ marginLeft: 10, color: colors.text }}>Add multiple items</Text>
          </View>
          <View style={styles.buttonRow}>
            <StyledButton
              title="Cancel"
              icon="close-circle-outline"
              variant="secondary"
              onPress={() => showWarningIfNeeded(() => navigation.goBack())}
            />
            <StyledButton
              title="Save Item"
              icon="checkmark-circle-outline"
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
    </SafeAreaView>
  );
}
