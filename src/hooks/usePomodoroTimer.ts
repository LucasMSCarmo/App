import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PomodoroProfile } from './usePomodoroProfiles';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export function usePomodoroTimer(activeProfile: PomodoroProfile) {
    const [timerMode, setTimerMode] = useState<TimerMode>('focus');
    const [secondsLeft, setSecondsLeft] = useState(activeProfile.focusMin * 60);
    const [isActive, setIsActive] = useState(false);
    const [focusCount, setFocusCount] = useState(0);       // focus blocks completed
    const [currentCycle, setCurrentCycle] = useState(1);   // current cycle (1-based)

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Refs to avoid stale closures
    const timerModeRef = useRef(timerMode);
    const focusCountRef = useRef(focusCount);
    const currentCycleRef = useRef(currentCycle);
    const activeProfileRef = useRef(activeProfile);

    useEffect(() => { timerModeRef.current = timerMode; }, [timerMode]);
    useEffect(() => { focusCountRef.current = focusCount; }, [focusCount]);
    useEffect(() => { currentCycleRef.current = currentCycle; }, [currentCycle]);
    useEffect(() => { activeProfileRef.current = activeProfile; }, [activeProfile]);

    const getModeSeconds = useCallback((mode: TimerMode, profile: PomodoroProfile) => {
        if (mode === 'focus') return profile.focusMin * 60;
        if (mode === 'shortBreak') return profile.shortMin * 60;
        return profile.longMin * 60;
    }, []);

    const getModeLabel = useCallback((mode: TimerMode) => {
        if (mode === 'focus') return 'Foco';
        if (mode === 'shortBreak') return 'Pausa Curta';
        return 'Pausa Longa';
    }, []);

    const sendTimerCompleteNotification = async (mode: TimerMode) => {
        const title = mode === 'focus' ? 'Foco Concluído!' : 'Pausa Concluída!';
        const body = mode === 'focus' ? 'Hora de uma pausa.' : 'Hora de voltar ao foco!';
        await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger: null,
        });
    };

    const advancePhase = useCallback(() => {
        const profile = activeProfileRef.current;
        let nextMode: TimerMode = 'focus';
        let newFocusCount = focusCountRef.current;
        let newCycle = currentCycleRef.current;

        if (timerModeRef.current === 'focus') {
            newFocusCount += 1;
            if (newFocusCount >= profile.intervalsBeforeLongBreak) {
                nextMode = 'longBreak';
                newFocusCount = 0; // reset block count
            } else {
                nextMode = 'shortBreak';
            }
        } else {
            // Se estava em pausa longa, é o fim de um ciclo completo
            if (timerModeRef.current === 'longBreak') {
                newCycle += 1;
                if (newCycle > profile.totalCycles) {
                    setIsActive(false);
                    Alert.alert('Parabéns!', 'Você concluiu todos os ciclos programados para esta sessão.');
                    // Reseta tudo
                    setFocusCount(0);
                    setCurrentCycle(1);
                    setTimerMode('focus');
                    setSecondsLeft(getModeSeconds('focus', profile));
                    return;
                }
            }
            nextMode = 'focus';
        }

        setFocusCount(newFocusCount);
        setCurrentCycle(newCycle);
        setTimerMode(nextMode);
        setSecondsLeft(getModeSeconds(nextMode, profile));
        
        // Auto-start next timer
        setIsActive(true);
        sendTimerCompleteNotification(timerModeRef.current);
    }, [getModeSeconds]);

    // Handle timer tick
    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(() => {
                setSecondsLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        Vibration.vibrate([0, 500, 200, 500]);
                        advancePhase();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, advancePhase]);

    // Reset cycle when active profile changes
    useEffect(() => {
        setIsActive(false);
        setFocusCount(0);
        setCurrentCycle(1);
        setTimerMode('focus');
        setSecondsLeft(getModeSeconds('focus', activeProfile));
    }, [activeProfile, getModeSeconds]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetCurrentTimer = () => {
        setIsActive(false);
        setSecondsLeft(getModeSeconds(timerMode, activeProfile));
    };

    const resetAllCycles = () => {
        setIsActive(false);
        setFocusCount(0);
        setCurrentCycle(1);
        setTimerMode('focus');
        setSecondsLeft(getModeSeconds('focus', activeProfile));
    };

    const skipTimer = () => {
        setIsActive(false);
        if (timerMode === 'longBreak' && currentCycle >= activeProfile.totalCycles) {
            return; // Can't skip if we are on the very last step
        }
        advancePhase();
    };
    
    const canSkip = !(timerMode === 'longBreak' && currentCycle >= activeProfile.totalCycles);

    return {
        timerMode,
        secondsLeft,
        isActive,
        focusCount,
        currentCycle,
        getModeLabel,
        toggleTimer,
        resetCurrentTimer,
        resetAllCycles,
        skipTimer,
        canSkip,
    };
}
