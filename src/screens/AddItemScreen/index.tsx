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
import { RootStackParamList } from '../../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import ImagePickerButton from '../../components/ImagePickerButton';
import { saveImageLocally, getLocalImageUri } from '../../lib/filesystem';
import CategoryPicker from '../../components/CategoryPicker';
import TagInput from '../../components/TagInput';
import StyledInput from '../../components/StyledInput';
import MetadataInput from '../../components/MetadataInput';
import StyledButton from '../../components/StyledButton';
import { createStyles } from './styles';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

type AddItemScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddItem'>;

type AddItemScreenRouteProp = RouteProp<RootStackParamList, 'AddItem'>;

export default function AddItemScreen() {
  const navigation = useNavigation<AddItemScreenNavigationProp>();
  const route = useRoute<AddItemScreenRouteProp>();
  const { addItemOptimistic, updateItemOptimistic } = useDatabase();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  const scrollViewRef = useRef<ScrollView>(null);

  const editItem = route.params?.item;
  const isEditing = !!editItem;

  // Track "saved" state to compare against for unsaved changes detection
  const [savedState, setSavedState] = useState({
    name: editItem?.name || '',
    description: editItem?.description || '',
    category: editItem?.category || '',
    tags: editItem?.tags || [],
    images: editItem?.images || [],
    metadata: editItem?.metadata || {},
  });

  const [name, setName] = useState(savedState.name);
  const [description, setDescription] = useState(savedState.description);
  const [category, setCategory] = useState(savedState.category);

  // Transform metadata object to array for editing, or use defaults
  const initialMetadata = useMemo(() => {
    if (editItem?.metadata) {
      const entries = Object.entries(editItem.metadata).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      // Pad with defaults if few entries
      if (entries.length < 4) {
        const defaults = ['Color', 'Size', 'Brand', 'Material'];
        const existingKeys = new Set(entries.map((e) => e.key));
        defaults.forEach((d) => {
          if (!existingKeys.has(d)) entries.push({ key: d, value: '' });
        });
      }
      return entries;
    }
    return [
      { key: 'Color', value: '' },
      { key: 'Size', value: '' },
      { key: 'Brand', value: '' },
      { key: 'Material', value: '' },
    ];
  }, [editItem]);

  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(initialMetadata);
  const [tags, setTags] = useState<string[]>(savedState.tags);
  const [images, setImages] = useState<string[]>(savedState.images);
  const [multiAdd, setMultiAdd] = useState(false);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);

  // Detect if form has unsaved changes by comparing to saved state
  const hasUnsavedChanges = useMemo(() => {
    if (name !== savedState.name) return true;
    if (description !== savedState.description) return true;
    if (category !== savedState.category) return true;
    if (JSON.stringify(tags) !== JSON.stringify(savedState.tags)) return true;
    if (JSON.stringify(images) !== JSON.stringify(savedState.images)) return true;

    const currentMetaObj = Object.fromEntries(
      metadata.filter((m) => m.key && m.value.trim() !== '').map((m) => [m.key, m.value]),
    );
    if (JSON.stringify(currentMetaObj) !== JSON.stringify(savedState.metadata)) return true;

    return false;
  }, [name, description, category, images, tags, metadata, savedState]);

  // Show warning when navigating away with unsaved changes
  const { skipWarningOnce } = useUnsavedChangesWarning(hasUnsavedChanges);

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
        metadata.filter((m) => m.key && m.value.trim() !== '').map((m) => [m.key, m.value]),
      );
      const tagArr = tags;

      // Save images permanently (only new ones)
      const savedImageUris: string[] = [];
      try {
        for (const uri of images) {
          // If it's already a local path from the DB, keep it
          if (!uri.startsWith('file://')) {
            savedImageUris.push(uri);
            continue;
          }
          const newPath = await saveImageLocally(uri);
          savedImageUris.push(newPath);
        }
      } catch (e) {
        console.error('Failed to save images locally', e);
        Alert.alert('Error', 'Failed to save images');
        return false;
      }

      try {
        if (isEditing && editItem) {
          await updateItemOptimistic(editItem.id, {
            name,
            description,
            category,
            metadata: metaObj,
            tags: tagArr,
            images: savedImageUris,
          });
        } else {
          await addItemOptimistic({
            name,
            description,
            category,
            metadata: metaObj,
            tags: tagArr,
            images: savedImageUris,
          });

          if (multiAdd) {
            // Reset form for next item
            const emptyState = {
              name: '',
              description: '',
              category: '',
              tags: [],
              images: [],
              metadata: {},
            };
            setSavedState(emptyState);
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
          }
        }

        // Update saved state so hasUnsavedChanges becomes false
        setSavedState({
          name,
          description,
          category,
          tags: tagArr,
          images: savedImageUris,
          metadata: metaObj,
        });
      } catch (err) {
        console.error(err);
        Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} item`);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!isTagInputFocused}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 40 }]}
          nestedScrollEnabled={true}
          indicatorStyle={isDark ? 'white' : 'black'}
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

          <CategoryPicker value={category} onSelect={setCategory} required />

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
                <Image source={{ uri: getLocalImageUri(uri) }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.deleteImageButton} onPress={() => removeImage(idx)}>
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

          {!isEditing && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 10,
              }}
            >
              <Switch
                value={multiAdd}
                onValueChange={setMultiAdd}
                trackColor={{
                  false: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  true: colors.primary + '80',
                }}
                thumbColor={multiAdd ? colors.primary : isDark ? colors.textMuted : '#f4f3f4'}
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
              />
              <Text style={{ marginLeft: 10, color: colors.text }}>Add multiple items</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <StyledButton
              title="Cancel"
              icon="close-circle-outline"
              variant="secondary"
              onPress={() => navigation.goBack()}
            />
            <StyledButton
              title={isEditing ? 'Update Item' : 'Save Item'}
              icon={isEditing ? 'save-outline' : 'checkmark-circle-outline'}
              onPress={async () => {
                const result = await handleAddItem();

                if (!result) return;

                // Skip warning since we intentionally saved
                skipWarningOnce();

                if (isEditing) {
                  Alert.alert('Success', 'Item updated!');
                  navigation.goBack();
                  return;
                }

                if (!multiAdd) {
                  Alert.alert('Success', 'Item added!');
                  navigation.goBack();
                  return;
                }

                Toast.show({
                  type: 'success',
                  text1: 'Saved!',
                  position: 'bottom',
                  visibilityTime: 1400,
                  bottomOffset: 60,
                });
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
