// src/screens/HomeScreen/index.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
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
  const navigation = useNavigation<HomeScreenNavigationProp>();

  async function refreshItems() {
    console.log('Refreshing…');
    const data = await loadItems();
    console.log('Loaded:', data);
    setItems(data);
  }

  useEffect(() => {
    refreshItems();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshItems();
    });
    return unsubscribe;
  }, [navigation]);

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
      <View style={styles.buttonRow}>
          <Button title="Add Item" onPress={() => navigation.navigate('AddItem')} />
          <Button title="Clear All" color="red" onPress={handleClearAll} />
      </View>

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
