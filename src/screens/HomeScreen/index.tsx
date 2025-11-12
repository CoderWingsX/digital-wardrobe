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
import { useDatabase } from '../../contexts/DatabaseContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, WardrobeItem } from '../../types';
import Toast from 'react-native-toast-message';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
import styles from './styles';

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { items, loading, refresh, clearAllOptimistic } = useDatabase();

  // Initial data load is handled by DatabaseProvider; Home only needs
  // to refresh on navigation focus which is handled below.

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refresh();
    });
    return unsubscribe;
  }, [navigation]);

  async function handleClearAll() {
    if (items.length === 0) {
      Toast.show({
        type: 'info', // 'info' is a good type for this
        text1: 'Wardrobe is already empty',
        position: 'bottom', // You can specify position here too
      });
      return; // Stop the function here
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
          // Note: You probably don't need 'await refresh()' here
          // because clearAllOptimistic already set items to []
          // await refresh();
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
