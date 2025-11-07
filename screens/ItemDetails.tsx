import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Button, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { loadItems, deleteItem } from '../db';

type ItemDetailsRouteProp = RouteProp<{ params: { itemId: number } }, 'params'>;

export default function ItemDetails() {
  const route = useRoute<ItemDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { itemId } = route.params;

  const [item, setItem] = useState<any>(null);

  async function fetchItem() {
    const items = await loadItems();
    const selected = items.find(i => i.id === itemId);
    setItem(selected || null);
  }

  useEffect(() => {
    fetchItem();
  }, []);

  async function handleDelete() {
    Alert.alert('Confirm', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(itemId);
          console.log("Item deleted.");
          await fetchItem();
          navigation.goBack();
        }
      }
    ]);

    
  }

  if (!item) return <Text style={styles.loading}>Loading...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.category}>{item.category}</Text>
      <Text style={styles.description}>{item.description}</Text>

      {Object.keys(item.metadata).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metadata:</Text>
          {Object.entries(item.metadata).map(([k, v]) => (
            <Text key={k}>• {k}: {String(v)}</Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags:</Text>
        <Text>{item.tags.length > 0 ? item.tags.join(', ') : '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Images:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(item.images && item.images.length > 0 ? item.images : ['https://img.icons8.com/?size=100&id=80545&format=png&color=000000']).map((img: string, idx: number) => (
            <Image key={idx} source={{ uri: img }} style={styles.image} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Delete Item" color="red" onPress={handleDelete} />
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
  image: { width: 120, height: 120, borderRadius: 8, marginRight: 10 },
  buttonContainer: { marginTop: 20 }
});
