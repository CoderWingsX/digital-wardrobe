// src/navigation/TabNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import HomeScreen from '../screens/HomeScreen/index';
import SearchScreen from '../screens/SearchScreen/index';
import ItemDetailsScreen from '../screens/ItemDetailsScreen/index';
import AddItemScreen from '../screens/AddItemScreen/index';
import SettingsScreen from '../screens/SettingsScreen/index';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors.headerBackground,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 100,
                    paddingBottom: 22,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: colors.headerBackground,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    color: colors.text,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Wardrobe"
                component={SearchScreen}
                options={{
                    title: 'Wardrobe',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="shirt-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Add"
                component={AddItemScreen}
                options={{
                    title: 'Add Item',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="ItemDetails"
                component={ItemDetailsScreen}
                options={{
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
        </Tab.Navigator>
    );
}
