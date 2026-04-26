// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@theme_preference';

export type ThemeMode =
  | 'light'
  | 'dark'
  | 'system'
  | 'sakura'
  | 'forest'
  | 'champagne'
  | 'nord'
  | 'sunset'
  | 'ocean'
  | 'crimson'
  | 'slate';

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F7',
  card: '#FFFFFF',
  text: '#1D1D1F',
  textSecondary: '#6E6E73',
  textMuted: '#86868B',
  border: '#D2D2D7',
  primary: '#007AFF',
  danger: '#FF3B30',
  success: '#34C759',
  inputBackground: '#FFFFFF',
  inputBorder: '#D2D2D7',
  headerBackground: '#FFFFFF',
  tabBar: '#FFFFFF',
};

export const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#F5F5F7',
  textSecondary: '#86868B',
  textMuted: '#6E6E73',
  border: '#3A3A3C',
  primary: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  inputBackground: '#1C1C1E',
  inputBorder: '#3A3A3C',
  headerBackground: '#1C1C1E',
  tabBar: '#1C1C1E',
};

export const sakuraColors = {
  background: '#120B1A',
  surface: '#1F1429',
  card: '#2D1D3A',
  text: '#F8F1FF',
  textSecondary: '#DDBDEB',
  textMuted: '#A27BAF',
  border: '#3D284F',
  primary: '#E91E63',
  danger: '#FF5252',
  success: '#8BC34A',
  inputBackground: '#1F1429',
  inputBorder: '#3D284F',
  headerBackground: '#120B1A',
  tabBar: '#120B1A',
};

export const forestColors = {
  background: '#1A2F2B',
  surface: '#243F3A',
  card: '#2E4F49',
  text: '#E8F3F1',
  textSecondary: '#A9C7C1',
  textMuted: '#7D9E98',
  border: '#3C6760',
  primary: '#4CAF50',
  danger: '#FF7043',
  success: '#AED581',
  inputBackground: '#243F3A',
  inputBorder: '#3C6760',
  headerBackground: '#1A2F2B',
  tabBar: '#1A2F2B',
};

export const champagneColors = {
  background: '#FCF8F2',
  surface: '#F5EFE6',
  card: '#FCF8F2',
  text: '#4A4031',
  textSecondary: '#7A6E5D',
  textMuted: '#A69B8D',
  border: '#E3D7C5',
  primary: '#C5A059',
  danger: '#D32F2F',
  success: '#689F38',
  inputBackground: '#FFFFFF',
  inputBorder: '#E3D7C5',
  headerBackground: '#FCF8F2',
  tabBar: '#FCF8F2',
};

export const nordColors = {
  background: '#2E3440',
  surface: '#3B4252',
  card: '#434C5E',
  text: '#ECEFF4',
  textSecondary: '#D8DEE9',
  textMuted: '#81848C',
  border: '#4C566A',
  primary: '#88C0D0',
  danger: '#BF616A',
  success: '#A3BE8C',
  inputBackground: '#3B4252',
  inputBorder: '#4C566A',
  headerBackground: '#2E3440',
  tabBar: '#2E3440',
};

export const sunsetColors = {
  background: '#1A1423',
  surface: '#2D1E3E',
  card: '#3D2B56',
  text: '#FFF0F0',
  textSecondary: '#FFCCBC',
  textMuted: '#9E8B8B',
  border: '#4A3B5F',
  primary: '#FF7043',
  danger: '#FF5252',
  success: '#FFB74D',
  inputBackground: '#2D1E3E',
  inputBorder: '#4A3B5F',
  headerBackground: '#1A1423',
  tabBar: '#1A1423',
};

export const oceanColors = {
  background: '#F0F8FF',
  surface: '#E1F5FE',
  card: '#F0F8FF',
  text: '#01579B',
  textSecondary: '#0288D1',
  textMuted: '#4FC3F7',
  border: '#B3E5FC',
  primary: '#03A9F4',
  danger: '#E57373',
  success: '#4DB6AC',
  inputBackground: '#FFFFFF',
  inputBorder: '#B3E5FC',
  headerBackground: '#F0F8FF',
  tabBar: '#F0F8FF',
};

export const crimsonColors = {
  background: '#1A0505',
  surface: '#2D0D0D',
  card: '#3D1414',
  text: '#FFF5F5',
  textSecondary: '#E8B0B0',
  textMuted: '#A67373',
  border: '#4D1A1A',
  primary: '#FF4D4D',
  danger: '#FF1A1A',
  success: '#4CAF50',
  inputBackground: '#2D0D0D',
  inputBorder: '#4D1A1A',
  headerBackground: '#1A0505',
  tabBar: '#1A0505',
};

export const slateColors = {
  background: '#F1F5F9',
  surface: '#E2E8F0',
  card: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#CBD5E1',
  primary: '#334155',
  danger: '#991B1B',
  success: '#166534',
  inputBackground: '#FFFFFF',
  inputBorder: '#CBD5E1',
  headerBackground: '#F1F5F9',
  tabBar: '#F1F5F9',
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
        const saved = (await AsyncStorage.getItem(THEME_STORAGE_KEY)) as ThemeMode;
        if (saved) {
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

  const isDark =
    mode === 'system'
      ? systemColorScheme === 'dark'
      : ['dark', 'sakura', 'forest', 'nord', 'sunset', 'crimson'].includes(mode);

  const themeMap: Record<ThemeMode, ThemeColors> = {
    light: lightColors,
    dark: darkColors,
    sakura: sakuraColors,
    forest: forestColors,
    champagne: champagneColors,
    nord: nordColors,
    sunset: sunsetColors,
    ocean: oceanColors,
    crimson: crimsonColors,
    slate: slateColors,
    system: systemColorScheme === 'dark' ? darkColors : lightColors,
  };

  const colors = themeMap[mode];

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
