// src/screens/HomeScreen/index.tsx

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

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
import styles from './styles';

export default function HomeScreen() {
  const { items, clearAll } = useDatabase();
  const navigation = useNavigation<HomeScreenNavigationProp>();


  async function handleClearAll() {
    Alert.alert('Confirm', 'Delete all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          console.log('Items Cleared.');
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
