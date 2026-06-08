import { AppState, Platform } from 'react-native';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

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
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { TaskProvider } from '@/src/contexts/TaskContext';
import { usePermissions } from '@/src/hooks/usePermitions';
import { shouldAutoSync, syncNow } from '@/src/database/sync';
import { HomeFeaturesGate } from '@/src/components/HomeFeaturesGate';

import '@/src/hooks/useNotification';

import { LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['pt-br'] = {
    monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthNamesShort: ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'],
    dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    dayNamesShort: ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'],
    today: 'Hoje',
};

LocaleConfig.defaultLocale = 'pt-br';

function AutoSyncGate() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const runAutoSync = async () => {
      if (await shouldAutoSync()) {
        await syncNow().catch((error) => {
          console.log('Erro ao sincronizar automaticamente', error?.message ?? error);
        });
      }
    };

    runAutoSync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runAutoSync();
    });

    return () => subscription.remove();
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  const { requestNotificationPermission, hasNotificationPermission } = usePermissions();

  useEffect(() => {
    async function requestInitialPermissions() {
      if (hasNotificationPermission === null) return;
      if (!hasNotificationPermission) {
        await requestNotificationPermission(false);
      }
    }

    // Only ask if they haven't been asked yet or explicitly declined before startup.
    // However, expo permissions on first load might be undeterminated.
    // So this is just a best effort to pop it up early.
    // The delay ensures UI is ready.
    setTimeout(() => {
      requestInitialPermissions();
    }, 1000);
  }, [hasNotificationPermission, requestNotificationPermission]);

  useEffect(() => {
    async function configureAndroidBars() {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = require('expo-navigation-bar');

          await NavigationBar.setVisibilityAsync('hidden');
        } catch (e) {
          console.warn("Aviso: expo-navigation-bar não encontrado.");
        }
      }
    }

    configureAndroidBars();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <TaskProvider>
          <AutoSyncGate />
          <HomeFeaturesGate />
          <StatusBar hidden={true} translucent />

          <Stack screenOptions={{ headerShown: false }} />
        </TaskProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
