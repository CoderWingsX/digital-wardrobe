// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@theme_preference';

export type ThemeMode = 'light' | 'dark' | 'system';

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  primary: '#007AFF',
  danger: '#FF3B30',
  success: '#34C759',
  inputBackground: '#FFFFFF',
  inputBorder: '#CCCCCC',
  headerBackground: '#FFFFFF',
  tabBar: '#FFFFFF',
};

export const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#ABABAB',
  textMuted: '#666666',
  border: '#3A3A3C',
  primary: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  inputBackground: '#1C1C1E',
  inputBorder: '#3A3A3C',
  headerBackground: '#1C1C1E',
  tabBar: '#1C1C1E',
};

export type ThemeColors = typeof lightColors;

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {
        // Ignore errors, use default
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch {
      // Ignore save errors
    }
  };

  const isDark = mode === 'system' 
    ? systemColorScheme === 'dark' 
    : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  // Don't render until we've loaded the preference
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
