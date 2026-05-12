import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const g = globalThis as any;
  
  if (typeof g.crypto === 'undefined') {
    try {
      g.crypto = require('expo-crypto');
    } catch (e) {
      console.warn("Aviso: expo-crypto não encontrado.");
    }
  }
}

import { ThemeProvider } from '@/src/contexts/ThemeContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { TaskProvider } from '@/src/contexts/TaskContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TaskProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </TaskProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}