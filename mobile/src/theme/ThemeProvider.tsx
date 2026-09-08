import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as storage from '../utils/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const light = {
  // Core
  primary: '#0D7C66', primaryDark: '#095E4D', accent: '#C9A84C',
  // Surfaces
  background: '#F6F8F7', surface: '#FFFFFF', surfaceMuted: '#F0F4F2',
  card: '#FFFFFF', elevatedSurface: '#FFFFFF', inputBackground: '#F0F4F2',
  // Text
  text: '#172B26', textSecondary: '#64736E', textMuted: '#8A9893',
  // Status
  border: '#DCE5E1',
  success: '#15803D', successBg: '#ECFDF5', successText: '#065F46',
  warning: '#B45309', warningBg: '#FEF3C7', warningText: '#92400E',
  error: '#DC2626', errorBg: '#FEF2F2', errorText: '#991B1B',
  info: '#2563EB', infoBg: '#EFF6FF', infoText: '#1E40AF',
  // Category
  deen: '#1B6B3A', dunya: '#1B3A6B',
  deenBg: '#EAF5EE', dunyaBg: '#EAF0F5',
  healthBg: '#F0FDF4', learningBg: '#F5F3FF',
  // Overlay
  overlay: 'rgba(18, 34, 29, 0.45)',
};

const dark = {
  // Core
  primary: '#35B99B', primaryDark: '#0D7C66', accent: '#E2BE63',
  // Surfaces
  background: '#101917', surface: '#192522', surfaceMuted: '#22312D',
  card: '#1E2926', elevatedSurface: '#232F2B', inputBackground: '#151F1C',
  // Text
  text: '#EEF7F3', textSecondary: '#B2C3BD', textMuted: '#82948D',
  // Status
  border: '#31423D',
  success: '#4ADE80', successBg: '#0D2B1D', successText: '#6EE7B7',
  warning: '#FBBF24', warningBg: '#292311', warningText: '#FDE68A',
  error: '#F87171', errorBg: '#2D1515', errorText: '#FCA5A5',
  info: '#60A5FA', infoBg: '#0F1F35', infoText: '#93C5FD',
  // Category
  deen: '#5AC77A', dunya: '#7CA8EF',
  deenBg: '#0D2B1A', dunyaBg: '#0D1B2E',
  healthBg: '#0D2B1D', learningBg: '#1A1130',
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type AppColors = typeof light;
interface ThemeContextValue {
  colors: AppColors;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');

  useEffect(() => {
    storage.getItemAsync('themePreference').then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
    });
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await storage.setItemAsync('themePreference', next);
  }, []);

  const value = useMemo(() => ({ colors: isDark ? dark : light, preference, isDark, setPreference }), [isDark, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useAppTheme must be used inside ThemeProvider');
  return theme;
}
