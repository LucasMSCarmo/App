import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const POMODORO_PROFILES_KEY = '@pomodoro_saved_profiles';
const ACTIVE_PROFILE_ID_KEY = '@pomodoro_active_profile_id';

export interface PomodoroProfile {
    id: string;
    name: string;
    focusMin: number;
    shortMin: number;
    longMin: number;
    intervalsBeforeLongBreak: number;
    totalCycles: number;
}

export const DEFAULT_PROFILES: PomodoroProfile[] = [
    {
        id: '1',
        name: 'Clássico',
        focusMin: 25,
        shortMin: 5,
        longMin: 15,
        intervalsBeforeLongBreak: 4,
        totalCycles: 4,
    },
    {
        id: '2',
        name: 'Foco Extremo',
        focusMin: 50,
        shortMin: 10,
        longMin: 20,
        intervalsBeforeLongBreak: 2,
        totalCycles: 2,
    },
];

export function usePomodoroProfiles() {
    const [profiles, setProfiles] = useState<PomodoroProfile[]>(DEFAULT_PROFILES);
    const [activeProfile, setActiveProfile] = useState<PomodoroProfile>(DEFAULT_PROFILES[0]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function loadStoredData() {
            try {
                const [storedProfiles, storedActiveId] = await Promise.all([
                    AsyncStorage.getItem(POMODORO_PROFILES_KEY),
                    AsyncStorage.getItem(ACTIVE_PROFILE_ID_KEY),
                ]);

                let list = DEFAULT_PROFILES;
                if (storedProfiles) {
                    list = JSON.parse(storedProfiles);
                    setProfiles(list);
                } else {
                    await AsyncStorage.setItem(POMODORO_PROFILES_KEY, JSON.stringify(list));
                }

                if (storedActiveId) {
                    const found = list.find((p: PomodoroProfile) => p.id === storedActiveId);
                    if (found) setActiveProfile(found);
                }
            } catch (err) {
                console.error("Erro ao carregar perfis pomodoro", err);
            } finally {
                setIsLoaded(true);
            }
        }
        loadStoredData();
    }, []);

    const saveProfilesAndActive = async (newProfiles: PomodoroProfile[], newActive: PomodoroProfile) => {
        setProfiles(newProfiles);
        setActiveProfile(newActive);
        await Promise.all([
            AsyncStorage.setItem(POMODORO_PROFILES_KEY, JSON.stringify(newProfiles)),
            AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, newActive.id),
        ]);
    };

    const addProfile = async (profile: PomodoroProfile) => {
        const newProfiles = [...profiles, profile];
        await saveProfilesAndActive(newProfiles, profile);
    };

    const editProfile = async (profile: PomodoroProfile) => {
        const newProfiles = profiles.map(p => p.id === profile.id ? profile : p);
        const newActive = activeProfile.id === profile.id ? profile : activeProfile;
        await saveProfilesAndActive(newProfiles, newActive);
    };

    const deleteProfile = async (id: string) => {
        const newProfiles = profiles.filter((p) => p.id !== id);
        let newActive = activeProfile;
        if (activeProfile.id === id) {
            newActive = newProfiles[0] || DEFAULT_PROFILES[0];
        }
        await saveProfilesAndActive(newProfiles, newActive);
    };

    const changeActiveProfile = async (id: string) => {
        const found = profiles.find((p) => p.id === id);
        if (found) {
            setActiveProfile(found);
            await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, found.id);
        }
    };

    return {
        profiles,
        activeProfile,
        isLoaded,
        addProfile,
        editProfile,
        deleteProfile,
        changeActiveProfile,
    };
}
