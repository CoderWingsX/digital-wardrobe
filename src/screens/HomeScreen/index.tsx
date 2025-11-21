// src/screens/HomeScreen/index.tsx
//import React, { useEffect, useState } from 'react';
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
import { RootStackParamList } from '../../types';
import Toast from 'react-native-toast-message';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
import styles from './styles';

export default function HomeScreen() {
  const { items, loading, refreshItems, clearAllOptimistic } = useDatabase();
  const navigation = useNavigation<HomeScreenNavigationProp>();


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
          console.log('[db] Items Cleared.');
          Toast.show({
            type: 'success',
            text1: 'All items cleared',
          });
          //await refreshItems();
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
