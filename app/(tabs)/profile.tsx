import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Linking from 'expo-linking';
import RNFS from 'react-native-fs';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ThemeMode } from '@/src/types/theme';
import { CategoryManager } from '@/src/components/CategoryManager';
import { SYNC_LAST_SYNC_KEY, SYNC_WIFI_ONLY_KEY, syncNow } from '@/src/database/sync';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';
import ProfileTaskStatistics from '@/src/components/ProfileTaskStatistics';
import {
    createDataBackup,
    inspectDataBackup,
    restoreDataBackup,
} from '@/src/services/dataBackupService';

import { usePermissions } from '@/src/hooks/usePermitions';

type SectionProps = { title: string; children: React.ReactNode };
type EditMode = 'name' | 'email' | 'password';
type RowProps = {
    icon: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    destructive?: boolean;
    disabled?: boolean;
};

const BIOMETRY_KEY = '@biometry_enabled';

function Section({ title, children }: SectionProps) {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {children}
            </View>
        </View>
    );
}

function Row({ icon, label, sublabel, onPress, right, destructive, disabled }: RowProps) {
    const { colors } = useTheme();
    const labelColor = destructive ? colors.danger : disabled ? colors.textDisabled : colors.text;
    const iconColor = destructive ? colors.danger : disabled ? colors.textDisabled : colors.primary;

    return (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            disabled={disabled || !onPress}
            activeOpacity={onPress ? 0.65 : 1}
        >
            <View style={[styles.rowIconWrap, { backgroundColor: destructive ? colors.dangerSurface : colors.primarySurface }]}>
                <Ionicons name={icon as any} size={18} color={iconColor} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
                {sublabel ? <Text style={[styles.rowSublabel, { color: colors.textMuted }]}>{sublabel}</Text> : null}
            </View>
            {right ?? (onPress && !destructive
                ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                : null
            )}
        </TouchableOpacity>
    );
}

function Separator() {
    const { colors } = useTheme();
    return <View style={[styles.separator, { backgroundColor: colors.divider }]} />;
}

function getApiErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.error
        ?? error?.response?.data?.message
        ?? fallback;
}

function Profile() {
    const { user, logout, refreshUser, updateProfile, changePassword } = useAuth();
    const { colors, mode, setMode } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        hasNotificationPermission, requestNotificationPermission,
        hasLocationPermission, requestLocationPermission,
        checkPermissions,
    } = usePermissions();

    const [biometryEnabled, setBiometryEnabled] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const [syncWifiOnly, setSyncWifiOnly] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<EditMode | null>(null);
    const [savingAccount, setSavingAccount] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [currentPasswordInput, setCurrentPasswordInput] = useState('');
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

    React.useEffect(() => {
        AsyncStorage.multiGet([BIOMETRY_KEY, SYNC_WIFI_ONLY_KEY, SYNC_LAST_SYNC_KEY]).then(pairs => {
            const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
            if (map[BIOMETRY_KEY]) setBiometryEnabled(map[BIOMETRY_KEY] === 'true');
            if (map[SYNC_WIFI_ONLY_KEY]) setSyncWifiOnly(map[SYNC_WIFI_ONLY_KEY] === 'true');
            if (map[SYNC_LAST_SYNC_KEY]) setLastSyncAt(map[SYNC_LAST_SYNC_KEY]);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            checkPermissions();
            refreshUser().catch((error) => {
                console.log('Erro ao atualizar usuário no perfil', error);
            });
        }, [checkPermissions, refreshUser]),
    );

    const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
        { label: 'Sistema', value: 'system', icon: 'phone-portrait-outline' },
        { label: 'Claro', value: 'light', icon: 'sunny-outline' },
        { label: 'Escuro', value: 'dark', icon: 'moon-outline' },
    ];

    const openEditModal = useCallback((modeToEdit: EditMode) => {
        setEditMode(modeToEdit);
        setNameInput(user?.name ?? '');
        setEmailInput(user?.email ?? '');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
    }, [user]);

    const closeEditModal = useCallback(() => {
        if (savingAccount) return;
        setEditMode(null);
    }, [savingAccount]);

    const handleSaveAccount = useCallback(async () => {
        if (!editMode) return;

        try {
            setSavingAccount(true);

            if (editMode === 'name') {
                const name = nameInput.trim();
                if (!name) {
                    Alert.alert('Nome obrigatório', 'Informe um nome para continuar.');
                    return;
                }
                await updateProfile({ name });
            }

            if (editMode === 'email') {
                const email = emailInput.trim().toLowerCase();
                if (!email) {
                    Alert.alert('E-mail obrigatório', 'Informe um e-mail para continuar.');
                    return;
                }
                await updateProfile({ email });
            }

            if (editMode === 'password') {
                if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
                    Alert.alert('Campos obrigatórios', 'Preencha a senha atual, a nova senha e a confirmação.');
                    return;
                }
                if (newPasswordInput !== confirmPasswordInput) {
                    Alert.alert('Senhas diferentes', 'A confirmação precisa ser igual à nova senha.');
                    return;
                }
                if (newPasswordInput.length < 6) {
                    Alert.alert('Senha muito curta', 'Use pelo menos 6 caracteres para a nova senha.');
                    return;
                }
                await changePassword({
                    currentPassword: currentPasswordInput,
                    newPassword: newPasswordInput,
                });
            }

            setEditMode(null);
            Alert.alert('Sucesso', 'Informações atualizadas.');
        } catch (error: any) {
            Alert.alert('Erro', getApiErrorMessage(error, 'Não foi possível atualizar as informações.' + JSON.stringify(error)));
            console.log(JSON.stringify(error));
        } finally {
            setSavingAccount(false);
        }
    }, [
        changePassword,
        confirmPasswordInput,
        currentPasswordInput,
        editMode,
        emailInput,
        nameInput,
        newPasswordInput,
        updateProfile,
    ]);

    const toggleBiometry = useCallback(async (value: boolean) => {
        if (value) {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            if (!compatible || !enrolled) {
                Alert.alert(
                    'Biometria indisponível',
                    'Seu dispositivo não possui biometria cadastrada. Configure nas configurações do Android.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir configurações', onPress: () => Linking.openURL('android.settings.SECURITY_SETTINGS') },
                    ]
                );
                return;
            }
            const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme sua identidade' });
            if (!result.success) return;
        }
        setBiometryEnabled(value);
        await AsyncStorage.setItem(BIOMETRY_KEY, String(value));
    }, []);

    const toggleNotifications = useCallback(async (value: boolean) => {
        if (value) {
            await requestNotificationPermission(true);
        } else {
            Alert.alert(
                'Desativar notificações?',
                'Se você remover esta permissão nas configurações, o aplicativo não poderá mais lembrá-lo dos prazos de suas tarefas. Deseja abrir as configurações para desativar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
                ]
            );
        }
    }, [requestNotificationPermission]);

    const toggleLocation = useCallback(async (value: boolean) => {
        if (value) {
            await requestLocationPermission(true);
        } else {
            Alert.alert(
                'Desativar localização?',
                'Ao desativar o acesso à localização em segundo plano nas configurações, as tarefas baseadas em localização (geofencing) pararão de alertá-lo quando você estiver próximo aos locais. Deseja abrir as configurações para desativar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
                ]
            );
        }
    }, [requestLocationPermission]);

    const toggleSyncWifiOnly = useCallback(async (value: boolean) => {
        setSyncWifiOnly(value);
        await AsyncStorage.setItem(SYNC_WIFI_ONLY_KEY, String(value));
    }, []);

    const handleSyncNow = useCallback(async () => {
        setSyncing(true);
        try {
            await syncNow();
            const lastSync = await AsyncStorage.getItem(SYNC_LAST_SYNC_KEY);
            setLastSyncAt(lastSync);
            Alert.alert('Sincronizado', 'Dados locais e online foram sincronizados.');
        } catch (error: any) {
            const message = error?.response?.data?.message ?? 'Não foi possível sincronizar agora. Verifique a internet e tente novamente.';
            Alert.alert('Erro', message);
        } finally {
            setSyncing(false);
        }
    }, []);

    const handleExport = useCallback(async () => {
        setLoadingExport(true);
        try {
            const { content, summary } = await createDataBackup({
                id: user?.id,
                name: user?.name,
                email: user?.email,
            });

            const path = `${RNFS.CachesDirectoryPath}/agendinha_backup_${Date.now()}.json`;
            await RNFS.writeFile(path, content, 'utf8');

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(`file://${path}`, {
                    mimeType: 'application/json',
                    dialogTitle: 'Exportar dados',
                    UTI: 'public.json',
                });
                await RNFS.unlink(path).catch(() => undefined);
                if (summary.warningCount > 0) {
                    Alert.alert(
                        'Backup exportado com avisos',
                        summary.warnings.join('\n'),
                    );
                }
            } else {
                Alert.alert('Exportado', `Arquivo salvo em:\n${path}`);
            }
        } catch (e: any) {
            console.error(e);
            Alert.alert('Erro', e?.message || 'Não foi possível exportar os dados.');
        } finally {
            setLoadingExport(false);
        }
    }, [user]);

    const handleImport = useCallback(async () => {
        setLoadingImport(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/json', 'text/plain', 'application/octet-stream'],
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled) return;

            const asset = result.assets[0];
            const content = await RNFS.readFile(asset.uri, 'utf8');
            const summary = inspectDataBackup(content, user?.id);
            const backupDate = new Date(summary.exportedAt).toLocaleString('pt-BR');
            const warningText = summary.warningCount > 0
                ? `\n\nAvisos: ${summary.warnings.join(' ')}`
                : '';

            setLoadingImport(false);
            Alert.alert(
                'Restaurar backup?',
                `Backup de ${backupDate} com ${summary.taskCount} tarefa(s), `
                + `${summary.subtaskCount} subtarefa(s), ${summary.categoryCount} categoria(s) `
                + `e ${summary.attachmentCount} anexo(s).\n\n`
                + `Todos os dados locais atuais serão substituídos.${warningText}`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Restaurar',
                        style: 'destructive',
                        onPress: async () => {
                            setLoadingImport(true);
                            try {
                                const restored = await restoreDataBackup(content, user?.id);
                                const [restoredWifiOnly, restoredTheme] = await Promise.all([
                                    AsyncStorage.getItem(SYNC_WIFI_ONLY_KEY),
                                    AsyncStorage.getItem('@theme_mode'),
                                ]);
                                setSyncWifiOnly(restoredWifiOnly === 'true');
                                if (
                                    restoredTheme === 'system'
                                    || restoredTheme === 'light'
                                    || restoredTheme === 'dark'
                                ) {
                                    setMode(restoredTheme);
                                }
                                const message = restored.warningCount > 0
                                    ? `Dados restaurados. Avisos:\n${restored.warnings.join('\n')}`
                                    : 'Dados e anexos restaurados com sucesso.';
                                Alert.alert('Importação concluída', message);
                            } catch (error: any) {
                                console.error(error);
                                Alert.alert(
                                    'Erro',
                                    error?.message || 'Não foi possível restaurar o backup.',
                                );
                            } finally {
                                setLoadingImport(false);
                            }
                        },
                    },
                ],
            );
        } catch (e: any) {
            console.error(e);
            Alert.alert(
                'Backup inválido',
                e?.message || 'Não foi possível ler o arquivo selecionado.',
            );
        } finally {
            setLoadingImport(false);
        }
    }, [setMode, user?.id]);

    const handleLogout = useCallback(() => {
        Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: logout },
        ]);
    }, [logout]);

    const openAppSettings = useCallback(() => {
        Linking.openSettings();
    }, []);

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Avatar + info */}
            <View style={styles.avatarSection}>
                <View style={[styles.avatar, { backgroundColor: colors.primarySurface, borderColor: colors.border }]}>
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {user?.name?.charAt(0).toUpperCase() ?? '?'}
                    </Text>
                </View>
                <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            </View>

            <Section title="ESTATÍSTICAS">
                <ProfileTaskStatistics />
            </Section>

            {/* Conta */}
            <Section title="CONTA">
                <Row
                    icon="person-outline"
                    label="Nome"
                    sublabel={user?.name}
                    onPress={() => openEditModal('name')}
                />
                <Separator />
                <Row
                    icon="mail-outline"
                    label="E-mail"
                    sublabel={user?.email}
                    onPress={() => openEditModal('email')}
                />
                <Separator />
                <Row
                    icon="lock-closed-outline"
                    label="Mudar senha"
                    onPress={() => openEditModal('password')}
                />
            </Section>

            {/* Segurança */}
            <Section title="SEGURANÇA">
                <Row
                    icon="finger-print-outline"
                    label="Biometria"
                    sublabel="Usar impressão digital ou Face ID para entrar"
                    right={
                        <Switch
                            value={biometryEnabled}
                            onValueChange={toggleBiometry}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    }
                />
                <Separator />
                <Row
                    icon="shield-checkmark-outline"
                    label="Permissões do aplicativo"
                    sublabel="Câmera, galeria, notificações..."
                    onPress={openAppSettings}
                />
            </Section>

            {/* Aparência */}
            <Section title="APARÊNCIA">
                <View style={styles.themeRow}>
                    {themeOptions.map((opt, i) => {
                        const active = mode === opt.value;
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.themeOption,
                                    { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySurface : colors.surface },
                                ]}
                                onPress={() => setMode(opt.value)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={opt.icon as any} size={18} color={active ? colors.primary : colors.textMuted} />
                                <Text style={[styles.themeOptionLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Section>

            {/* Permissões */}
            <Section title="PERMISSÕES">
                <Row
                    icon="notifications-outline"
                    label="Notificações push"
                    sublabel="Lembretes de prazos de tarefas"
                    right={
                        <Switch
                            value={hasNotificationPermission ?? false}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    }
                />
                <Separator />
                <Row
                    icon="location-outline"
                    label="Localização em 2º plano"
                    sublabel="Avisos quando próximo a locais"
                    right={
                        <Switch
                            value={hasLocationPermission ?? false}
                            onValueChange={toggleLocation}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    }
                />
            </Section>

            {/* Dados */}
            <Section title="SINCRONIZAÇÃO">
                <Row
                    icon="cloud-upload-outline"
                    label="Sincronizar agora"
                    sublabel={lastSyncAt ? `Última: ${new Date(lastSyncAt).toLocaleString('pt-BR')}` : 'Enviar e baixar alterações'}
                    onPress={syncing ? undefined : handleSyncNow}
                    right={syncing ? <ActivityIndicator size="small" color={colors.primary} /> : <SyncStatusBadge />}
                />
                <Separator />
                <Row
                    icon="wifi-outline"
                    label="Sincronizar só no Wi-Fi"
                    sublabel="Evita sincronização automática em dados móveis"
                    right={
                        <Switch
                            value={syncWifiOnly}
                            onValueChange={toggleSyncWifiOnly}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    }
                />
            </Section>

            {/* Dados */}
            {user?.id && (
                <Section title="CATEGORIAS">
                    <CategoryManager userId={user.id} />
                </Section>
            )}

            {/* Dados */}
            <Section title="DADOS">
                <Row
                    icon="download-outline"
                    label="Exportar dados"
                    sublabel="Salvar backup em JSON"
                    onPress={loadingExport ? undefined : handleExport}
                    right={loadingExport ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
                />
                <Separator />
                <Row
                    icon="upload-outline"
                    label="Importar dados"
                    sublabel="Restaurar de um backup JSON"
                    onPress={loadingImport ? undefined : handleImport}
                    right={loadingImport ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
                />
            </Section>

            {/* Sair */}
            <Section title="">
                <Row
                    icon="log-out-outline"
                    label="Sair da conta"
                    onPress={handleLogout}
                    destructive
                />
            </Section>

            {/* Versão */}
            <Text style={[styles.version, { color: colors.textMuted }]}>
                Agendinha v1.0.0
            </Text>

            <Modal
                visible={!!editMode}
                transparent
                animationType="fade"
                onRequestClose={closeEditModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editMode === 'name' ? 'Editar nome' : editMode === 'email' ? 'Editar e-mail' : 'Mudar senha'}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalIconButton}
                                onPress={closeEditModal}
                                disabled={savingAccount}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {editMode === 'name' ? (
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                value={nameInput}
                                onChangeText={setNameInput}
                                placeholder="Nome"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="words"
                                editable={!savingAccount}
                            />
                        ) : null}

                        {editMode === 'email' ? (
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                value={emailInput}
                                onChangeText={setEmailInput}
                                placeholder="E-mail"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!savingAccount}
                            />
                        ) : null}

                        {editMode === 'password' ? (
                            <View style={styles.inputGroup}>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={currentPasswordInput}
                                    onChangeText={setCurrentPasswordInput}
                                    placeholder="Senha atual"
                                    placeholderTextColor={colors.textMuted}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    editable={!savingAccount}
                                />
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={newPasswordInput}
                                    onChangeText={setNewPasswordInput}
                                    placeholder="Nova senha"
                                    placeholderTextColor={colors.textMuted}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    editable={!savingAccount}
                                />
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={confirmPasswordInput}
                                    onChangeText={setConfirmPasswordInput}
                                    placeholder="Confirmar nova senha"
                                    placeholderTextColor={colors.textMuted}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    editable={!savingAccount}
                                />
                            </View>
                        ) : null}

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: colors.border }]}
                                onPress={closeEditModal}
                                disabled={savingAccount}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveAccount}
                                disabled={savingAccount}
                                activeOpacity={0.8}
                            >
                                {savingAccount ? (
                                    <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                                ) : (
                                    <Text style={[styles.primaryButtonText, { color: colors.buttonPrimaryText }]}>Salvar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

export default Profile;

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 24 },
    avatarSection: { alignItems: 'center', marginBottom: 32, gap: 6 },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    avatarInitial: { fontSize: 34, fontWeight: '700' },
    userName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
    userEmail: { fontSize: 14 },
    section: { marginBottom: 24 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionCard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 12,
        minHeight: 52,
    },
    rowIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: '500' },
    rowSublabel: { fontSize: 12, marginTop: 1 },
    separator: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
    themeRow: {
        flexDirection: 'row',
        gap: 8,
        padding: 14,
    },
    themeOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        gap: 6,
    },
    themeOptionLabel: { fontSize: 12, fontWeight: '600' },
    version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.42)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 18,
        gap: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalIconButton: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        gap: 10,
    },
    input: {
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 15,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    secondaryButton: {
        minHeight: 42,
        minWidth: 96,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    primaryButton: {
        minHeight: 42,
        minWidth: 96,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
