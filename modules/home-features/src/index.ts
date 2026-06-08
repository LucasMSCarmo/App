import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type HomeWidgetTask = {
  id: string;
  title: string;
  time?: string;
  done: boolean;
};

type HomeFeaturesNativeModule = {
  syncTodayTasksAsync(tasksJson: string): Promise<boolean>;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<HomeFeaturesNativeModule>('AgendinhaHomeFeatures')
  : null;

export async function syncTodayTasksWidget(tasks: HomeWidgetTask[]) {
  if (!nativeModule) return false;
  return nativeModule.syncTodayTasksAsync(JSON.stringify(tasks));
}
