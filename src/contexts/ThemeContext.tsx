import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/constants/colors';
import { ThemeMode } from '@/src/types/theme';

const STORAGE_KEY = '@theme_mode';

type ThemeContextData = {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: typeof Colors.light;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setModeState(saved as ThemeMode);
    });
  }, []);
  
  const resolvedTheme: 'light' | 'dark' =
    (mode === 'system' ? (systemScheme ?? 'light') : mode) as 'light' | 'dark';

  const colors = Colors[resolvedTheme];

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);