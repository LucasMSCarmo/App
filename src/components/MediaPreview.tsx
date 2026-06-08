import React, { useState } from 'react';
import {
    Dimensions,
    Image,
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
import RNFS from 'react-native-fs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { LocalMedia, MediaType } from '@/src/constants/mediaConstants';
import { MediaViewer } from '@/src/components/MediaViewer';

// ── constantes ────────────────────────────────────────────────────────────────

const PREVIEW_SIZE = 72;
const PREVIEW_NAME_HEIGHT = 16;
const MAX_VISIBLE_FILES = 4;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── helpers ───────────────────────────────────────────────────────────────────

const truncateName = (name: string, maxLen = 10) =>
    name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── ícone por tipo ────────────────────────────────────────────────────────────

function FileTypeIcon({ type, size, color }: { type: MediaType; size: number; color: string }) {
    if (type === 'image') return <Ionicons name="image-outline" size={size} color={color} />;
    if (type === 'video') return <Ionicons name="videocam-outline" size={size} color={color} />;
    if (type === 'audio') return <MaterialIcons name="audiotrack" size={size} color={color} />;
    return <Ionicons name="document-outline" size={size} color={color} />;
}

// ── props ─────────────────────────────────────────────────────────────────────

interface MediaPreviewProps {
    files: LocalMedia[];
    onChange: (files: LocalMedia[]) => void;
    crud: boolean;
}

// ── componente ────────────────────────────────────────────────────────────────

export function MediaPreview({ files, onChange, crud }: MediaPreviewProps) {
    const { colors } = useTheme();

    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [listVisible, setListVisible] = useState(false);

    const visibleFiles = files.slice(0, MAX_VISIBLE_FILES);
    const extraCount = files.length - MAX_VISIBLE_FILES;

    // ── handlers ──────────────────────────────────────────────────────────────

    const openFile = (index: number) => {
        setViewerIndex(index);
    };

    const removeFile = async (index: number) => {
        const file = files[index];
        try {
            const rawPath = file.localUrl.replace('file://', '');
            if (await RNFS.exists(rawPath)) await RNFS.unlink(rawPath);
        } catch { }
        onChange(files.filter((_, i) => i !== index));
    };

    const renameFile = (index: number, newName: string) => {
        const updated = files.map((f, i) =>
            i === index ? { ...f, name: `${newName}.${f.name.split('.').pop()}` } : f
        );
        onChange(updated);
    };

    // ── render ────────────────────────────────────────────────────────────────

    if (files.length === 0) {
        return (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="attach-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {crud ? 'Nenhum anexo selecionado' : 'Sem imagens ou arquivos anexados'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.row}>
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
                        onPress={() => openFile(index)}
                        activeOpacity={0.8}
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
                                <FileTypeIcon type={file.type as MediaType} size={28} color={colors.primary} />
                            </View>
                        )}

                        <Text
                            style={[styles.previewName, { color: colors.textMuted }]}
                            numberOfLines={1}
                        >
                            {truncateName(file.name, 9)}
                        </Text>
                        {crud && (
                            <Pressable
                                style={[styles.removeButton, { backgroundColor: colors.danger }]}
                                onPress={() => removeFile(index)}
                                hitSlop={6}
                            >
                                <Ionicons name="close" size={10} color={colors.textOnDanger} />
                            </Pressable>
                        )}
                    </TouchableOpacity>
                ))}

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

            {/* ── Lista completa ── */}
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
                                onPress={() => { setListVisible(false); openFile(index); }}
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
                                        {file.type} · {formatSize(file.size)}
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

            {/* ── Viewer ── */}
            <MediaViewer
                visible={viewerIndex !== null}
                selectedIndex={viewerIndex}
                files={files}
                onClose={() => setViewerIndex(null)}
                onRename={(index, newName) => renameFile(index, newName)}
                crud={crud}
            />
        </View>
    );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: PREVIEW_SIZE + PREVIEW_NAME_HEIGHT + 4,
        flex: 1,
    },
    emptyBox: {
        flex: 1,
        alignSelf: 'stretch',
        minHeight: 66,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyText: {
        fontSize: 12,
        fontWeight: '600',
    },
    previewList: { flex: 1 },
    previewScroll: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 2,
        paddingRight: 4,
    },
    previewItem: {
        alignItems: 'center',
        width: PREVIEW_SIZE,
        position: 'relative',
    },
    previewImage: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
    },
    previewPlaceholder: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewName: {
        fontSize: 10,
        marginTop: 4,
        textAlign: 'center',
        width: PREVIEW_SIZE,
        height: PREVIEW_NAME_HEIGHT,
    },
    removeButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 3,
    },
    extraChip: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    extraChipText: { fontSize: 16, fontWeight: '700' },
    extraChipSub: { fontSize: 9 },
    listOverlay: { ...StyleSheet.absoluteFillObject },
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
    listTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
    listContent: { paddingHorizontal: 18, paddingBottom: 8 },
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
    listItemName: { fontSize: 14, fontWeight: '500' },
    listItemMeta: { fontSize: 12, marginTop: 2 },
    listRemove: { padding: 4 },
});
