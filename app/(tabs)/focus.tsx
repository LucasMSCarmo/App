import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/src/contexts/ThemeContext';
import { usePomodoroProfiles } from '@/src/hooks/usePomodoroProfiles';
import { usePomodoroTimer } from '@/src/hooks/usePomodoroTimer';
import { PomodoroProfileManager } from '@/src/components/PomodoroProfileManager';

// ── constantes ────────────────────────────────────────────────────────────────

type ScreenState = 'timer' | 'list' | 'create';

// ── helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const DND_STORAGE_KEY = '@pomodoro_dnd_enabled';

const formatTime = (seconds: number) =>
    `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

// ── componente principal ──────────────────────────────────────────────────────

export default function PomodoroTimer() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const {
        profiles,
        activeProfile,
        isLoaded,
        addProfile,
        editProfile,
        deleteProfile,
        changeActiveProfile,
    } = usePomodoroProfiles();

    const {
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
    } = usePomodoroTimer(activeProfile);

    // ── estado de navegação ───────────────────────────────────────────────────
    const [screenState, setScreenState] = useState<ScreenState>('timer');
    const [dndEnabled, setDndEnabled] = useState(false);

    // ── animação de pulso do timer ────────────────────────────────────────────
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.015, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
    }, [isActive, pulseAnim]);

    useEffect(() => {
        AsyncStorage.getItem(DND_STORAGE_KEY)
            .then((value) => setDndEnabled(value === 'true'))
            .catch(() => setDndEnabled(false));
    }, []);

    useEffect(() => {
        const shouldMute = dndEnabled && isActive && timerMode === 'focus';
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldPlaySound: !shouldMute,
                shouldSetBadge: false,
                shouldShowBanner: !shouldMute,
                shouldShowList: !shouldMute,
            }),
        });
    }, [dndEnabled, isActive, timerMode]);

    const toggleDnd = async () => {
        const nextValue = !dndEnabled;
        setDndEnabled(nextValue);
        await AsyncStorage.setItem(DND_STORAGE_KEY, String(nextValue));
    };

    // ── derivados para a UI ───────────────────────────────────────────────────
    if (!isLoaded) return <View style={[styles.screen, { backgroundColor: colors.background }]} />;

    const totalSeconds = activeProfile[`${timerMode === 'shortBreak' ? 'shortMin' : timerMode === 'longBreak' ? 'longMin' : 'focusMin'}`] * 60;
    const progress = (totalSeconds - secondsLeft) / totalSeconds; // 0–1
    const isFocus = timerMode === 'focus';
    const modeColor = isFocus ? colors.primary : colors.success;
    // blocos dentro do ciclo atual
    const blocksInCurrentCycle = focusCount % activeProfile.intervalsBeforeLongBreak;

    if (screenState === 'list') {
        return (
            <PomodoroProfileManager
                profiles={profiles}
                activeProfile={activeProfile}
                addProfile={addProfile}
                editProfile={editProfile}
                deleteProfile={deleteProfile}
                changeActiveProfile={changeActiveProfile}
                onClose={() => setScreenState('timer')}
            />
        );
    }

    // ── TELA: TIMER ───────────────────────────────────────────────────────────

    return (
        <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>

                {/* cabeçalho */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.headerLabel, { color: colors.textMuted }]}>perfil ativo</Text>
                        <Text style={[styles.headerProfile, { color: colors.text }]} numberOfLines={1}>
                            {activeProfile.name}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => setScreenState('list')}
                    >
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.text} />
                        <Text style={[styles.headerBtnText, { color: colors.text }]}>Perfis</Text>
                    </TouchableOpacity>
                </View>

                {/* modo badge */}
                <View style={[styles.modeBadge, { backgroundColor: modeColor + '18', borderColor: modeColor + '40' }]}>
                    <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
                    <Text style={[styles.modeBadgeText, { color: modeColor }]}>{getModeLabel(timerMode)}</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.dndToggle,
                        {
                            backgroundColor: dndEnabled ? colors.primarySurface : colors.surface,
                            borderColor: dndEnabled ? colors.primary : colors.border,
                        },
                    ]}
                    onPress={toggleDnd}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name={dndEnabled ? 'notifications-off-outline' : 'notifications-outline'}
                        size={17}
                        color={dndEnabled ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.dndText, { color: dndEnabled ? colors.primary : colors.textSecondary }]}>
                        Não perturbe
                    </Text>
                </TouchableOpacity>

                {/* timer central */}
                <Animated.View style={[styles.timerWrap, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={[styles.timerRing, {
                        borderColor: colors.border,
                        shadowColor: modeColor,
                    }]}>
                        {/* arco de progresso via borda com clip — aproximação visual */}
                        <View style={[styles.timerProgress, {
                            borderColor: modeColor,
                            opacity: 0.3 + progress * 0.7,
                        }]} />
                        <Text style={[styles.timerText, { color: colors.text }]}>
                            {formatTime(secondsLeft)}
                        </Text>
                        <Text style={[styles.timerSub, { color: colors.textMuted }]}>
                            {isActive ? 'em andamento' : secondsLeft === totalSeconds ? 'pronto para iniciar' : 'pausado'}
                        </Text>
                    </View>
                </Animated.View>

                {/* indicadores de bloco */}
                <View style={styles.blocksRow}>
                    {Array.from({ length: activeProfile.intervalsBeforeLongBreak }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.blockDot,
                                {
                                    backgroundColor: i < blocksInCurrentCycle
                                        ? modeColor
                                        : colors.border,
                                    width: 40 / activeProfile.intervalsBeforeLongBreak > 12 ? 12 : 40 / activeProfile.intervalsBeforeLongBreak + 4,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* meta info */}
                <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.metaItem}>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{currentCycle}</Text>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>ciclo</Text>
                    </View>
                    <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.metaItem}>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{activeProfile.totalCycles}</Text>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>total</Text>
                    </View>
                    <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.metaItem}>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{focusCount}</Text>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>blocos</Text>
                    </View>
                    <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.metaItem}>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{activeProfile.focusMin}m</Text>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>foco</Text>
                    </View>
                </View>

                {/* controles */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={resetCurrentTimer}
                        onLongPress={resetAllCycles}
                    >
                        <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.mainBtn, { backgroundColor: isActive ? colors.warning : modeColor }]}
                        onPress={toggleTimer}
                        activeOpacity={0.85}
                    >
                        <Ionicons name={isActive ? 'pause' : 'play'} size={26} color="#fff" />
                        <Text style={styles.mainBtnText}>{isActive ? 'Pausar' : 'Iniciar'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.secondaryBtn, 
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            !canSkip && { opacity: 0.5 }
                        ]}
                        onPress={skipTimer}
                        disabled={!canSkip}
                    >
                        <Ionicons name="play-skip-forward" size={20} color={!canSkip ? colors.textDisabled : colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tipWrap}>
                    <Text style={[styles.tipText, { color: colors.textMuted }]}>
                        Dica: Segure o botão de recarregar para reiniciar tudo
                    </Text>
                </View>

                <View style={[styles.bottomSpacer, { height: insets.bottom + 8 }]} />
            </View>
        );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 20,
    },

    // cabeçalho
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    headerProfile: {
        fontSize: 16,
        fontWeight: '700',
        maxWidth: 200,
    },
    headerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    headerBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // badge de modo
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: 7,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 28,
    },
    modeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    modeBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    dndToggle: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        marginTop: -16,
        marginBottom: 20,
    },
    dndText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // timer
    timerWrap: {
        alignItems: 'center',
        marginBottom: 24,
    },
    timerRing: {
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 8,
    },
    timerProgress: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 3,
    },
    timerText: {
        fontSize: 58,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: -2,
    },
    timerSub: {
        fontSize: 12,
        marginTop: 4,
        letterSpacing: 0.2,
    },

    // blocos de foco
    blocksRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
    },
    blockDot: {
        height: 5,
        borderRadius: 3,
    },

    // card de meta
    metaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 14,
        marginBottom: 28,
    },
    metaItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    metaValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaDivider: {
        width: StyleSheet.hairlineWidth,
        height: 32,
    },

    // controles
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    tipWrap: {
        marginTop: 8,
        alignItems: 'center',
    },
    tipText: {
        fontSize: 12,
    },
    bottomSpacer: {
        width: '100%',
    },
    secondaryBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 36,
        height: 56,
        borderRadius: 28,
        minWidth: 160,
    },
    mainBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    // lista de perfis
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
    },
    backBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 16,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 16,
    },
    profileCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    activeIndicator: {
        width: 3,
        height: 40,
        borderRadius: 2,
    },
    profileName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 3,
    },
    profileSub: {
        fontSize: 12,
        marginTop: 1,
    },
    profileCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginLeft: 10,
    },

    // formulário
    formLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    formInput: {
        padding: 13,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: 15,
    },
    saveBtn: {
        padding: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
