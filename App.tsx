import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './db';
import HomeScreen from './screens/HomeScreen';
import ItemDetails from './screens/ItemDetails';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
  (async () => {
    await initDatabase(); 
  })();
}, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Wardrobe' }} />
        <Stack.Screen name="ItemDetails" component={ItemDetails} options={{ title: 'Item Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
