import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import RNFS from 'react-native-fs';
import * as Crypto from 'expo-crypto';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { usePermissions } from '@/src/hooks/usePermitions';
import { useTheme } from '@/src/contexts/ThemeContext';
import { LocalMedia, MediaType } from '../constants/mediaConstants';

// ── tipos ─────────────────────────────────────────────────────────────────────

interface MediaPickerProps {
    onChangeMedia: (media: LocalMedia[]) => void;
    maxFiles?: number;
}

// ── constantes ────────────────────────────────────────────────────────────────

const PREVIEW_SIZE = 52;
const MAX_VISIBLE_FILES = 4;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── helpers ───────────────────────────────────────────────────────────────────

const getCategoryFromMime = (mime: string): MediaType => {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
};

const getDirPath = (category: MediaType) =>
    `${RNFS.DocumentDirectoryPath}/${category}/`;

const truncateName = (name: string, maxLen = 10) =>
    name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;

// ── ícone por tipo ────────────────────────────────────────────────────────────

function FileTypeIcon({ type, size, color }: { type: MediaType; size: number; color: string }) {
    if (type === 'image') return <Ionicons name="image-outline" size={size} color={color} />;
    if (type === 'video') return <Ionicons name="videocam-outline" size={size} color={color} />;
    if (type === 'audio') return <MaterialIcons name="audiotrack" size={size} color={color} />;
    return <Ionicons name="document-outline" size={size} color={color} />;
}

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

    // visualizador fullscreen
    const [viewerFile, setViewerFile] = useState<LocalMedia | null>(null);

    // lista completa (modal)
    const [listVisible, setListVisible] = useState(false);

    const updateFiles = (updated: LocalMedia[]) => {
        setFiles(updated);
        onChangeMedia(updated);
    };

    // ── dropdown ──────────────────────────────────────────────────────────────

    const openDropdown = () => {
        clipButtonRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
            // Abre sempre para cima; dropdown tem ~160px de altura
            const DROPDOWN_HEIGHT = 160;
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

    // ── preparar arquivo ──────────────────────────────────────────────────────

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

        return {
            serverId: uuid,
            name: originalName,
            url: savedName,
            localUrl: destPath,
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

    // ── handlers ──────────────────────────────────────────────────────────────

    const pickFromGallery = async () => {
        closeDropdown();
        if (!canAddMore()) return;
        if (!hasGalleryPermission) {
            const granted = await requestGalleryPermission();
            if (!granted) return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: false,
            quality: 0.85,
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
            quality: 0.85,
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

    const removeFile = async (index: number) => {
        const file = files[index];
        try {
            if (await RNFS.exists(file.localUrl)) await RNFS.unlink(file.localUrl);
        } catch (_) { }
        updateFiles(files.filter((_, i) => i !== index));
    };

    const openFile = (file: LocalMedia) => {
        if (file.mimeType.startsWith('image/')) {
            setViewerFile(file);
        } else {
            Linking.openURL(file.localUrl).catch(() =>
                Alert.alert('Erro', 'Não foi possível abrir o arquivo.')
            );
        }
    };

    const isDisabled = loading || (maxFiles !== undefined && files.length >= maxFiles);
    const visibleFiles = files.slice(0, MAX_VISIBLE_FILES);
    const extraCount = files.length - MAX_VISIBLE_FILES;

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

            {/* ── Previews inline (até MAX_VISIBLE_FILES) ── */}
            {files.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.previewScroll}
                    style={styles.previewList}
                >
                    {visibleFiles.map((file, index) => (
                        <TouchableOpacity
                            key={file.serverId}
                            style={styles.previewItem}
                            onPress={() => openFile(file)}
                            activeOpacity={0.75}
                        >
                            {file.mimeType.startsWith('image/') ? (
                                <Image
                                    source={{ uri: file.localUrl }}
                                    style={[styles.previewImage, { borderColor: colors.cardBorder }]}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.previewPlaceholder, {
                                    backgroundColor: colors.primarySurface,
                                    borderColor: colors.cardBorder,
                                }]}>
                                    <FileTypeIcon type={file.type as MediaType} size={20} color={colors.primary} />
                                </View>
                            )}
                            <Text
                                style={[styles.previewName, { color: colors.textMuted }]}
                                numberOfLines={1}
                            >
                                {truncateName(file.name)}
                            </Text>
                            <Pressable
                                style={[styles.removeButton, { backgroundColor: colors.danger }]}
                                onPress={() => removeFile(index)}
                                hitSlop={6}
                            >
                                <Ionicons name="close" size={9} color={colors.textOnDanger} />
                            </Pressable>
                        </TouchableOpacity>
                    ))}

                    {/* "+N mais" quando passa do limite */}
                    {extraCount > 0 && (
                        <TouchableOpacity
                            style={[styles.extraChip, {
                                backgroundColor: colors.primarySurface,
                                borderColor: colors.cardBorder,
                            }]}
                            onPress={() => setListVisible(true)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.extraChipText, { color: colors.primary }]}>
                                +{extraCount}
                            </Text>
                            <Text style={[styles.extraChipSub, { color: colors.textMuted }]}>
                                ver todos
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}

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

            {/* ── Lista completa (modal) ── */}
            <Modal
                transparent
                visible={listVisible}
                animationType="slide"
                onRequestClose={() => setListVisible(false)}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={() => setListVisible(false)}>
                    <View style={[styles.listOverlay, { backgroundColor: colors.modalOverlay }]} />
                </TouchableWithoutFeedback>

                <View style={[styles.listSheet, { backgroundColor: colors.modalBackground }]}>
                    <View style={[styles.listHandle, { backgroundColor: colors.modalHandle }]} />

                    <View style={styles.listHeader}>
                        <Text style={[styles.listTitle, { color: colors.text }]}>
                            Anexos ({files.length})
                        </Text>
                        <TouchableOpacity onPress={() => setListVisible(false)} hitSlop={8}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.listContent}>
                        {files.map((file, index) => (
                            <TouchableOpacity
                                key={file.serverId}
                                style={[styles.listItem, { borderBottomColor: colors.divider }]}
                                onPress={() => { setListVisible(false); openFile(file); }}
                                activeOpacity={0.7}
                            >
                                {file.mimeType.startsWith('image/') ? (
                                    <Image
                                        source={{ uri: file.localUrl }}
                                        style={[styles.listThumb, { borderColor: colors.cardBorder }]}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[styles.listThumbPlaceholder, {
                                        backgroundColor: colors.primarySurface,
                                        borderColor: colors.cardBorder,
                                    }]}>
                                        <FileTypeIcon type={file.type as MediaType} size={24} color={colors.primary} />
                                    </View>
                                )}
                                <View style={styles.listItemInfo}>
                                    <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
                                        {file.name}
                                    </Text>
                                    <Text style={[styles.listItemMeta, { color: colors.textMuted }]}>
                                        {file.type} · {(file.size / 1024).toFixed(0)} KB
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeFile(index)}
                                    hitSlop={8}
                                    style={styles.listRemove}
                                >
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Visualizador fullscreen (imagens) ── */}
            <Modal
                transparent
                visible={!!viewerFile}
                animationType="fade"
                onRequestClose={() => setViewerFile(null)}
                statusBarTranslucent
            >
                <View style={styles.viewerOverlay}>
                    <TouchableOpacity
                        style={styles.viewerClose}
                        onPress={() => setViewerFile(null)}
                        hitSlop={12}
                    >
                        <View style={styles.viewerCloseInner}>
                            <Ionicons name="close" size={22} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    {viewerFile && (
                        <>
                            <Image
                                source={{ uri: viewerFile.localUrl }}
                                style={styles.viewerImage}
                                resizeMode="contain"
                            />
                            <View style={styles.viewerFooter}>
                                <Text style={styles.viewerName} numberOfLines={2}>
                                    {viewerFile.name}
                                </Text>
                                <Text style={styles.viewerMeta}>
                                    {(viewerFile.size / 1024).toFixed(0)} KB
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
};

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: PREVIEW_SIZE,
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

    // previews inline
    previewList: { flex: 1 },
    previewScroll: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingVertical: 2,
    },
    previewItem: {
        alignItems: 'center',
        width: PREVIEW_SIZE,
        position: 'relative',
    },
    previewImage: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    previewPlaceholder: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewName: {
        fontSize: 9,
        marginTop: 3,
        textAlign: 'center',
        width: PREVIEW_SIZE,
    },
    removeButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 3,
    },
    extraChip: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    extraChipText: {
        fontSize: 14,
        fontWeight: '700',
    },
    extraChipSub: {
        fontSize: 8,
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

    // lista completa
    listOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    listSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.6,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    listHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    listContent: {
        paddingHorizontal: 18,
        paddingBottom: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    listThumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    listThumbPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemInfo: { flex: 1 },
    listItemName: {
        fontSize: 14,
        fontWeight: '500',
    },
    listItemMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    listRemove: {
        padding: 4,
    },

    // fullscreen
    viewerOverlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerClose: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 24,
        right: 20,
        zIndex: 10,
    },
    viewerCloseInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.75,
    },
    viewerFooter: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 48 : 24,
        left: 20,
        right: 20,
    },
    viewerName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    viewerMeta: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        marginTop: 2,
    },
});