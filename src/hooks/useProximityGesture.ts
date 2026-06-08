import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
    addProximityListener,
    isProximityModuleLinked,
    isProximitySensorAvailable,
} from '@/modules/proximity-sensor/src';

const MIN_NEAR_DURATION_MS = 120;
const MAX_NEAR_DURATION_MS = 2500;
const GESTURE_COOLDOWN_MS = 1200;
const AVAILABILITY_TIMEOUT_MS = 2000;

type Options = {
    enabled: boolean;
    onGesture: () => void | Promise<void>;
};

export function useProximityGesture({ enabled, onGesture }: Options) {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const nearStartedAt = useRef<number | null>(null);
    const lastGestureAt = useRef(0);
    const callbackRef = useRef(onGesture);
    const appIsActive = useRef(AppState.currentState === 'active');

    useEffect(() => {
        callbackRef.current = onGesture;
    }, [onGesture]);

    const refreshAvailability = useCallback(async () => {
        if (!isProximityModuleLinked) {
            setIsAvailable(false);
            return false;
        }

        try {
            const available = await Promise.race([
                isProximitySensorAvailable(),
                new Promise<boolean>((resolve) => {
                    setTimeout(() => resolve(false), AVAILABILITY_TIMEOUT_MS);
                }),
            ]);
            setIsAvailable(available);
            return available;
        } catch (error) {
            console.warn('Não foi possível verificar o sensor de proximidade:', error);
            setIsAvailable(false);
            return false;
        }
    }, []);

    useEffect(() => {
        refreshAvailability();

        const subscription = AppState.addEventListener('change', (state) => {
            appIsActive.current = state === 'active';
            if (!appIsActive.current) nearStartedAt.current = null;
        });

        return () => subscription.remove();
    }, [refreshAvailability]);

    useEffect(() => {
        if (!enabled || isAvailable !== true) {
            nearStartedAt.current = null;
            return;
        }

        const subscription = addProximityListener(({ isNear }) => {
            if (!appIsActive.current) return;

            const now = Date.now();
            if (isNear) {
                if (nearStartedAt.current === null) nearStartedAt.current = now;
                return;
            }

            const startedAt = nearStartedAt.current;
            nearStartedAt.current = null;
            if (startedAt === null) return;

            const nearDuration = now - startedAt;
            const cooledDown = now - lastGestureAt.current >= GESTURE_COOLDOWN_MS;
            const isValidGesture = nearDuration >= MIN_NEAR_DURATION_MS
                && nearDuration <= MAX_NEAR_DURATION_MS;

            if (cooledDown && isValidGesture) {
                lastGestureAt.current = now;
                void callbackRef.current();
            }
        });

        return () => {
            nearStartedAt.current = null;
            subscription?.remove();
        };
    }, [enabled, isAvailable]);

    return {
        isAvailable,
        isModuleLinked: isProximityModuleLinked,
        refreshAvailability,
    };
}
