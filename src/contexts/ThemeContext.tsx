import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/constants/colors';
import { ThemeMode } from '@/src/types/theme';

const STORAGE_KEY = '@theme_mode';

type CalendarTheme = {
  calendarBackground: string;
  textSectionTitleColor: string;
  dayTextColor: string;
  todayTextColor: string;
  todayBackgroundColor: string;
  monthTextColor: string;
  selectedDayBackgroundColor: string;
  selectedDayTextColor: string;
  dotColor: string;
  arrowColor: string;
  disabledArrowColor: string;
  textDisabledColor: string;
  'stylesheet.calendar.header': {
    header: { height: number; overflow: 'hidden'; opacity: number };
    week: { marginTop: number; marginBottom: number; flexDirection: 'row'; justifyContent: 'space-around' };
  };
};

type ThemeContextData = {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: typeof Colors.light;
  calendarTheme: CalendarTheme;
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

  // Tema do react-native-calendars derivado dos tokens de cores
  // Recalcula apenas quando o tema muda
  const calendarTheme = useMemo<CalendarTheme>(() => ({
    calendarBackground: colors.calendarThemeBg,
    textSectionTitleColor: colors.calendarWeekHeader,
    dayTextColor: colors.calendarDayText,
    todayTextColor: colors.calendarDayTodayText,
    todayBackgroundColor: colors.calendarDayToday,
    monthTextColor: colors.calendarHeaderText,
    selectedDayBackgroundColor: colors.calendarDaySelected,
    selectedDayTextColor: colors.calendarDaySelectedText,
    dotColor: colors.calendarDayHasEvent,
    arrowColor: colors.calendarThemeArrow,
    disabledArrowColor: colors.calendarThemeDisabledArrow,
    textDisabledColor: colors.calendarDayTextDisabled,
    // esconde o header interno via stylesheet — sem fontSize: 0 (crash Android)
    'stylesheet.calendar.header': {
      header: {
        height: 0,
        overflow: 'hidden',
        opacity: 0,
      },
      week: {
        marginTop: 0,
        marginBottom: 4,
        flexDirection: 'row' as const,
        justifyContent: 'space-around' as const,
      },
    },
  }), [resolvedTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, colors, calendarTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);