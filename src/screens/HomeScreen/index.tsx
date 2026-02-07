import React from 'react';
import {
  Alert,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import Toast from 'react-native-toast-message';
import { getLocalImageUri } from '../../lib/filesystem';
import styles from './styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { items, refresh, clearAllOptimistic } = useDatabase();

  // All items should be displayed, even without images
  const displayItems = items;

  async function handleClearAll() {
    if (items.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'Wardrobe is already empty',
        position: 'bottom',
      });
      return;
    }

    Alert.alert('Confirm', 'Delete all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await clearAllOptimistic();

          Toast.show({
            type: 'success',
            text1: 'All items cleared',
          });

          console.log('[db] Items Cleared.');
          await refresh();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <Button
          title="Add Item"
          onPress={() => navigation.navigate('AddItem')}
        />
        <Button title="Clear All" color="red" onPress={handleClearAll} />
      </View>

      <FlatList
        style={styles.list}
        data={displayItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              navigation.navigate('ItemDetails', { itemId: item.id })
            }
          >
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: getLocalImageUri(item.images[0]) }}
                style={styles.itemImage}
              />
            ) : (
              <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 24 }}>👕</Text>
              </View>
            )}
            <View style={styles.itemContent}>
              <Text style={styles.title} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
