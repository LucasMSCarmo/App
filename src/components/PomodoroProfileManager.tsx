import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    FlatList,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { PomodoroProfile } from '@/src/hooks/usePomodoroProfiles';

interface Props {
    profiles: PomodoroProfile[];
    activeProfile: PomodoroProfile;
    addProfile: (profile: PomodoroProfile) => Promise<void>;
    editProfile: (profile: PomodoroProfile) => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;
    changeActiveProfile: (id: string) => Promise<void>;
    onClose: () => void;
}

type ManagerState = 'list' | 'create';

export function PomodoroProfileManager({
    profiles,
    activeProfile,
    addProfile,
    editProfile,
    deleteProfile,
    changeActiveProfile,
    onClose,
}: Props) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [viewState, setViewState] = useState<ManagerState>('list');
    
    // Form state
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [inputName, setInputName] = useState('');
    const [inputFocus, setInputFocus] = useState('25');
    const [inputShort, setInputShort] = useState('5');
    const [inputLong, setInputLong] = useState('15');
    const [inputIntervals, setInputIntervals] = useState('4');
    const [inputCycles, setInputCycles] = useState('4');

    const startCreatingProfile = () => {
        setEditingProfileId(null);
        setInputName('');
        setInputFocus('25');
        setInputShort('5');
        setInputLong('15');
        setInputIntervals('4');
        setInputCycles('4');
        setViewState('create');
    };

    const startEditingProfile = (profile: PomodoroProfile) => {
        setEditingProfileId(profile.id);
        setInputName(profile.name);
        setInputFocus(profile.focusMin.toString());
        setInputShort(profile.shortMin.toString());
        setInputLong(profile.longMin.toString());
        setInputIntervals(profile.intervalsBeforeLongBreak.toString());
        setInputCycles(profile.totalCycles.toString());
        setViewState('create');
    };

    const handleSaveProfile = async () => {
        const f = parseInt(inputFocus, 10);
        const s = parseInt(inputShort, 10);
        const l = parseInt(inputLong, 10);
        const rep = parseInt(inputIntervals, 10);
        const cyc = parseInt(inputCycles, 10);

        if (!inputName.trim() || [f, s, l, rep, cyc].some(v => isNaN(v) || v <= 0)) {
            Alert.alert('Erro', 'Preencha o nome e todos os valores com números válidos.');
            return;
        }

        const newProfile: PomodoroProfile = {
            id: editingProfileId || String(Date.now()),
            name: inputName.trim(),
            focusMin: f,
            shortMin: s,
            longMin: l,
            intervalsBeforeLongBreak: rep,
            totalCycles: cyc,
        };

        if (editingProfileId) {
            await editProfile(newProfile);
        } else {
            await addProfile(newProfile);
        }
        
        await changeActiveProfile(newProfile.id);
        
        setEditingProfileId(null);
        setInputName(''); setInputFocus('25'); setInputShort('5');
        setInputLong('15'); setInputIntervals('4'); setInputCycles('4');
        
        // Go back to timer
        onClose();
    };

    const handleDeleteProfile = (id: string) => {
        if (id === '1' || id === '2') {
            Alert.alert('Bloqueado', 'Perfis padrão não podem ser excluídos.');
            return;
        }
        Alert.alert('Excluir Perfil', 'Deseja deletar este perfil?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive',
                onPress: async () => {
                    await deleteProfile(id);
                },
            },
        ]);
    };

    if (viewState === 'list') {
        return (
            <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                        <Text style={[styles.backBtnText, { color: colors.text }]}>Timer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerBtn, { backgroundColor: colors.primary }]}
                        onPress={startCreatingProfile}
                    >
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={[styles.headerBtnText, { color: '#fff' }]}>Novo</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.screenTitle, { color: colors.text }]}>Perfis de Estudo</Text>

                <FlatList
                    data={profiles}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ gap: 10, paddingBottom: insets.bottom + 24 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const isActive = item.id === activeProfile.id;
                        return (
                            <TouchableOpacity
                                style={[styles.profileCard, {
                                    backgroundColor: colors.surface,
                                    borderColor: isActive ? colors.primary : colors.border,
                                }]}
                                onPress={async () => {
                                    await changeActiveProfile(item.id);
                                    onClose();
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={styles.profileCardLeft}>
                                    {isActive && (
                                        <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                                    )}
                                    <View>
                                        <Text style={[styles.profileName, { color: colors.text }]}>{item.name}</Text>
                                        <Text style={[styles.profileSub, { color: colors.textMuted }]}>
                                            {item.focusMin}m foco · {item.shortMin}m curta · {item.longMin}m longa
                                        </Text>
                                        <Text style={[styles.profileSub, { color: colors.textMuted }]}>
                                            {item.intervalsBeforeLongBreak} blocos/ciclo · {item.totalCycles} ciclos
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.profileCardRight}>
                                    {isActive && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                    {item.id !== '1' && item.id !== '2' && (
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity onPress={() => startEditingProfile(item)} hitSlop={8}>
                                                <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteProfile(item.id)} hitSlop={8}>
                                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        );
    }

    const formFields = [
        { label: 'Nome do Perfil', value: inputName, onChange: setInputName, keyboard: 'default' as const, placeholder: 'Ex: Deep Work' },
        { label: 'Foco (minutos)', value: inputFocus, onChange: setInputFocus, keyboard: 'number-pad' as const, placeholder: '25' },
        { label: 'Pausa Curta (minutos)', value: inputShort, onChange: setInputShort, keyboard: 'number-pad' as const, placeholder: '5' },
        { label: 'Pausa Longa (minutos)', value: inputLong, onChange: setInputLong, keyboard: 'number-pad' as const, placeholder: '15' },
        { label: 'Blocos antes da pausa longa', value: inputIntervals, onChange: setInputIntervals, keyboard: 'number-pad' as const, placeholder: '4' },
        { label: 'Total de ciclos', value: inputCycles, onChange: setInputCycles, keyboard: 'number-pad' as const, placeholder: '4' },
    ];

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setViewState('list')}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                    <Text style={[styles.backBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.screenTitle, { color: colors.text }]}>{editingProfileId ? 'Editar Perfil' : 'Novo Perfil'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: insets.bottom + 40, paddingTop: 10 }}>
                {formFields.map((field) => (
                    <View key={field.label} style={{ marginBottom: 4 }}>
                        <Text style={[styles.formLabel, { color: colors.textSecondary, marginBottom: 8, fontWeight: '600', fontSize: 13 }]}>{field.label}</Text>
                        <TextInput
                            style={[styles.formInput, {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.inputText,
                                borderRadius: 12,
                                borderWidth: 1,
                                height: 50,
                                paddingHorizontal: 16,
                                fontSize: 16
                            }]}
                            value={field.value}
                            onChangeText={field.onChange}
                            keyboardType={field.keyboard}
                            placeholder={field.placeholder}
                            placeholderTextColor={colors.inputPlaceholder}
                            maxLength={field.keyboard === 'default' ? 40 : 3}
                        />
                    </View>
                ))}

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 12, height: 54, borderRadius: 14 }]}
                    onPress={handleSaveProfile}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.saveBtnText, { fontSize: 16, fontWeight: 'bold' }]}>Salvar e Ativar</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
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
