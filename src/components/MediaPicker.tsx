import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import RNFS from 'react-native-fs';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '@/src/hooks/usePermitions';
import { useTheme } from '@/src/contexts/ThemeContext';
import { LocalMedia, MediaType } from '../constants/mediaConstants';
import { MediaPreview } from './MediaPreview';

// ── tipos ─────────────────────────────────────────────────────────────────────

interface MediaPickerProps {
    onChangeMedia: (media: LocalMedia[]) => void;
    maxFiles?: number;
}

// ── constantes ────────────────────────────────────────────────────────────────

const PREVIEW_SIZE = 72;          // era 52 — maior para ver melhor
const PREVIEW_NAME_HEIGHT = 16;   // altura reservada para o nome
const MAX_VISIBLE_FILES = 4;

// ── helpers ───────────────────────────────────────────────────────────────────

const getCategoryFromMime = (mime: string): MediaType => {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
};

const getDirPath = (category: MediaType) =>
    `${RNFS.DocumentDirectoryPath}/${category}/`;

// ── componente ────────────────────────────────────────────────────────────────

export const MediaPicker = ({ onChangeMedia, maxFiles }: MediaPickerProps) => {
    const { colors } = useTheme();
    const { hasCameraPermission, hasGalleryPermission, requestCameraPermission, requestGalleryPermission } = usePermissions();

    const [files, setFiles] = useState<LocalMedia[]>([]);
    const [loading, setLoading] = useState(false);

    // dropdown
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [dropdownY, setDropdownY] = useState(0);
    const [dropdownX, setDropdownX] = useState(0);
    const clipButtonRef = useRef<View>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(8)).current;

    const updateFiles = (updated: LocalMedia[]) => {
        setFiles(updated);
        onChangeMedia(updated);
    };

    // ── dropdown ──────────────────────────────────────────────────────────────

    const openDropdown = () => {
        clipButtonRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
            const DROPDOWN_HEIGHT = 172;
            const MARGIN = 8;
            setDropdownY(py - DROPDOWN_HEIGHT - MARGIN);
            setDropdownX(px);
            setDropdownVisible(true);
            fadeAnim.setValue(0);
            translateAnim.setValue(8);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
                Animated.spring(translateAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }),
            ]).start();
        });
    };

    const closeDropdown = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
            Animated.timing(translateAnim, { toValue: 8, duration: 110, useNativeDriver: true }),
        ]).start(() => setDropdownVisible(false));
    };

    const prepareFile = async (
        uri: string,
        mimeType: string,
        originalName: string,
        fileSize: number,
    ): Promise<LocalMedia> => {
        const uuid = Crypto.randomUUID();
        const ext = originalName.split('.').pop()?.toLowerCase()
            || uri.split('.').pop()?.toLowerCase()
            || 'bin';
        const savedName = `${uuid}.${ext}`;
        const category = getCategoryFromMime(mimeType);
        const dirPath = getDirPath(category);
        const destPath = `${dirPath}${savedName}`;

        await RNFS.mkdir(dirPath);
        await RNFS.copyFile(uri, destPath);

        const localUrl = Platform.OS === 'android' && !destPath.startsWith('file://')
            ? `file://${destPath}`
            : destPath;

        return {
            serverId: uuid,
            name: originalName,
            url: savedName,
            localUrl,
            mimeType,
            type: category,
            size: fileSize,
        } as LocalMedia;
    };

    const canAddMore = (count = 1) => {
        if (maxFiles !== undefined && files.length + count > maxFiles) {
            Alert.alert('Limite atingido', `Você pode adicionar no máximo ${maxFiles} arquivo(s).`);
            return false;
        }
        return true;
    };

    const pickFromGallery = async () => {
        closeDropdown();
        if (!canAddMore()) return;
        if (!hasGalleryPermission) {
            const granted = await requestGalleryPermission();
            if (!granted) return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            quality: 1,
        });
        if (result.canceled) return;
        setLoading(true);
        try {
            const newFiles: LocalMedia[] = [];
            for (const asset of result.assets) {
                if (maxFiles !== undefined && files.length + newFiles.length >= maxFiles) break;
                newFiles.push(await prepareFile(
                    asset.uri,
                    asset.mimeType || 'image/jpeg',
                    asset.fileName || asset.uri.split('/').pop() || 'foto.jpg',
                    asset.fileSize || 0,
                ));
            }
            updateFiles([...files, ...newFiles]);
        } catch {
            Alert.alert('Erro', 'Não foi possível processar a imagem.');
        } finally {
            setLoading(false);
        }
    };

    const takePhoto = async () => {
        closeDropdown();
        if (!canAddMore()) return;
        if (!hasCameraPermission) {
            const granted = await requestCameraPermission();
            if (!granted) return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            quality: 1,
        });
        if (result.canceled) return;
        setLoading(true);
        try {
            const asset = result.assets[0];
            updateFiles([...files, await prepareFile(
                asset.uri,
                asset.mimeType || 'image/jpeg',
                asset.fileName || `foto_${Date.now()}.jpg`,
                asset.fileSize || 0,
            )]);
        } catch {
            Alert.alert('Erro', 'Não foi possível processar a foto.');
        } finally {
            setLoading(false);
        }
    };

    const pickDocument = async () => {
        closeDropdown();
        if (!canAddMore()) return;
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (result.canceled) return;
        setLoading(true);
        try {
            const asset = result.assets[0];
            updateFiles([...files, await prepareFile(
                asset.uri,
                asset.mimeType || 'application/octet-stream',
                asset.name,
                asset.size || 0,
            )]);
        } catch {
            Alert.alert('Erro', 'Não foi possível processar o arquivo.');
        } finally {
            setLoading(false);
        }
    };

    const isDisabled = loading || (maxFiles !== undefined && files.length >= maxFiles);
    const visibleFiles = files.slice(0, MAX_VISIBLE_FILES);

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <View style={styles.row}>

            {/* ── Botão clipe ── */}
            <View ref={clipButtonRef} collapsable={false}>
                <TouchableOpacity
                    onPress={openDropdown}
                    disabled={isDisabled}
                    style={[
                        styles.clipButton,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        isDisabled && styles.disabled,
                    ]}
                    activeOpacity={0.65}
                    hitSlop={8}
                >
                    {loading
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Ionicons name="attach" size={20} color={colors.textSecondary} />
                    }
                    {files.length > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.badgeText, { color: colors.textOnPrimary }]}>
                                {files.length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Dropdown ── */}
            <Modal
                transparent
                visible={dropdownVisible}
                animationType="none"
                onRequestClose={closeDropdown}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={closeDropdown}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.dropdown,
                        {
                            top: dropdownY,
                            left: dropdownX,
                            backgroundColor: colors.modalBackground,
                            borderColor: colors.modalBorder,
                            shadowColor: colors.cardShadow,
                            opacity: fadeAnim,
                            transform: [{ translateY: translateAnim }],
                        },
                    ]}
                >
                    {([
                        {
                            icon: <Ionicons name="images-outline" size={22} color={colors.primary} />,
                            label: 'Galeria',
                            sub: 'Fotos e vídeos',
                            onPress: pickFromGallery,
                        },
                        {
                            icon: <Ionicons name="camera-outline" size={22} color={colors.primary} />,
                            label: 'Câmera',
                            sub: 'Tirar foto agora',
                            onPress: takePhoto,
                        },
                        {
                            icon: <Ionicons name="document-outline" size={22} color={colors.primary} />,
                            label: 'Arquivo',
                            sub: 'PDF, doc, etc.',
                            onPress: pickDocument,
                        },
                    ] as const).map((item, i, arr) => (
                        <React.Fragment key={item.label}>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={item.onPress}
                                activeOpacity={0.65}
                            >
                                <View style={[styles.dropdownIconWrap, { backgroundColor: colors.primarySurface }]}>
                                    {item.icon}
                                </View>
                                <View style={styles.dropdownTexts}>
                                    <Text style={[styles.dropdownLabel, { color: colors.text }]}>
                                        {item.label}
                                    </Text>
                                    <Text style={[styles.dropdownSub, { color: colors.textMuted }]}>
                                        {item.sub}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            {i < arr.length - 1 && (
                                <View style={[styles.dropdownDivider, { backgroundColor: colors.divider }]} />
                            )}
                        </React.Fragment>
                    ))}
                </Animated.View>
            </Modal>

            <MediaPreview
                files={files}
                onChange={updateFiles}
                crud={true}
            />
        </View>
    );
};

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: PREVIEW_SIZE + PREVIEW_NAME_HEIGHT + 4,
    },

    // clipe
    clipButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: { opacity: 0.4 },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 13,
    },

    // dropdown
    dropdown: {
        position: 'absolute',
        minWidth: 210,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 10,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
    },
    dropdownIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownTexts: { flex: 1 },
    dropdownLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    dropdownSub: {
        fontSize: 12,
        marginTop: 1,
    },
    dropdownDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 14,
    },
});