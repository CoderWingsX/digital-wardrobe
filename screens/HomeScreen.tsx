import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TextInput, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { loadItems, addItem, clearAll, initDatabase } from '../db';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  ItemDetails: { itemId: number };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export default function HomeScreen(){
    const [items, setItems] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [metadata, setMetadata] = useState('');
    const [tags, setTags] = useState('');
    const navigation = useNavigation<HomeScreenNavigationProp>();

    async function RefreshItems() {
        console.log("Refreshing…");
        const data = await loadItems();
        console.log("Loaded:", data);
        setItems(data);
    }

    useEffect(() => {RefreshItems();}, []);
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            RefreshItems();
        });

        return unsubscribe;
        }, [navigation]);


    async function handleAddItem() {
        if (!name || !description || !category) {
            alert('Please fill in all required fields');
            return;
        }
        await addItem({ name, description, category, metadata, tags }); 
        alert('Item added!');
        setName('');  
        setDescription('');  
        setCategory('');  
        setMetadata('');  
        setTags('');  
        
        await RefreshItems();  
    }

    async function handleClearAll() {
        Alert.alert('Confirm', 'Delete all items?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                await clearAll();
                console.log("Items Cleared.");
                //console.log("Manual refresh");
                //setItems([]);
                await RefreshItems();
                }
            }
            ]);
        
        
      }


    return (
        <View style={styles.container}>
        {/* <Text style={styles.header}>Item Info</Text> */}

        <TextInput style={styles.input} placeholder="Item Name" value={name} onChangeText={setName} />  
        <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />  
        <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />  
        <TextInput style={styles.input} placeholder="Metadata (e.g., color:red, size:M)" value={metadata} onChangeText={setMetadata} />  
        <TextInput style={styles.input} placeholder="Tags (comma-separated)" value={tags} onChangeText={setTags} />  

        <View style={styles.buttonRow}>  
            <Button title="Add Item" onPress={handleAddItem} />  
            <Button title="Clear All" color="red" onPress={handleClearAll} />  
        </View>  

        <FlatList  
            data={items}  
            keyExtractor={(item) => item.id.toString()}  
            renderItem={({ item }) => (  
            <TouchableOpacity  
                style={styles.item}  
                onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}  
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

const styles = StyleSheet.create({
container: { flex: 1, paddingTop: 50, padding: 20 },
header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
item: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
title: { fontWeight: 'bold', fontSize: 16 },
});
    