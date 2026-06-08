import {
  NativeModule,
  requireOptionalNativeModule,
  type EventSubscription,
} from 'expo-modules-core';

export type ProximityEvent = {
  isNear: boolean;
  distance?: number;
  maximumRange?: number;
};

type ProximityEvents = {
  onProximityChanged: (event: ProximityEvent) => void;
};

declare class ProximityNativeModule extends NativeModule<ProximityEvents> {
  isAvailableAsync(): Promise<boolean>;
}

const nativeModule = requireOptionalNativeModule<ProximityNativeModule>('AgendinhaProximity');

export const isProximityModuleLinked = nativeModule !== null;

export async function isProximitySensorAvailable() {
  if (!nativeModule) return false;
  return nativeModule.isAvailableAsync();
}

export function addProximityListener(
  listener: (event: ProximityEvent) => void,
): EventSubscription | null {
  return nativeModule?.addListener('onProximityChanged', listener) ?? null;
}
