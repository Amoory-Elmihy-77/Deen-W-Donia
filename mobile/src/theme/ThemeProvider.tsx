import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as storage from '../utils/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const light = {
  primary: '#0D7C66', primaryDark: '#095E4D', accent: '#C9A84C',
  background: '#F6F8F7', surface: '#FFFFFF', surfaceMuted: '#F0F4F2',
  text: '#172B26', textSecondary: '#64736E', textMuted: '#8A9893',
  border: '#DCE5E1', success: '#15803D', warning: '#B45309', error: '#DC2626',
  deen: '#1B6B3A', dunya: '#1B3A6B', overlay: 'rgba(18, 34, 29, 0.45)',
};

const dark = {
  primary: '#35B99B', primaryDark: '#0D7C66', accent: '#E2BE63',
  background: '#101917', surface: '#192522', surfaceMuted: '#22312D',
  text: '#EEF7F3', textSecondary: '#B2C3BD', textMuted: '#82948D',
  border: '#31423D', success: '#4ADE80', warning: '#FBBF24', error: '#F87171',
  deen: '#5AC77A', dunya: '#7CA8EF', overlay: 'rgba(0, 0, 0, 0.6)',
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
