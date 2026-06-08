import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import ImageViewer from 'react-native-image-zoom-viewer';
import Pdf from 'react-native-pdf';
import { LocalMedia } from '@/src/constants/mediaConstants';
import { useTheme } from '@/src/contexts/ThemeContext';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isPdf = (file: LocalMedia) => file.mimeType === 'application/pdf';
const isImage = (file: LocalMedia) => file.mimeType.startsWith('image/');
const isOpenable = (file: LocalMedia) => !isImage(file) && !isPdf(file);

interface MediaViewerProps {
    visible: boolean;
    selectedIndex: number | null;
    files: LocalMedia[];
    onClose: () => void;
    onRename: (index: number, newName: string) => void;
    crud: boolean;
}

export function MediaViewer({ visible, selectedIndex, files, onClose, onRename, crud }: MediaViewerProps) {
    const { colors } = useTheme();

    const [viewerIndex, setViewerIndex] = useState<number>(selectedIndex ?? 0);
    const [editingName, setEditingName] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfTotal, setPdfTotal] = useState(1);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (selectedIndex !== null && selectedIndex !== undefined) {
            setViewerIndex(selectedIndex);
        }
    }, [selectedIndex]);

    useEffect(() => {
        const file = files[viewerIndex];
        if (file) {
            const lastDot = file.name.lastIndexOf('.');
            setEditingName(lastDot === -1 ? file.name : file.name.slice(0, lastDot));
        }
    }, [viewerIndex, files]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    useEffect(() => {
        setPdfPage(1);
        setPdfTotal(1);
    }, [viewerIndex]);

    const handleRename = () => {
        if (!isMounted.current) return;
        const trimmed = editingName.trim();
        if (trimmed) onRename(viewerIndex, trimmed);
    };

    const handleClose = () => {
        Keyboard.dismiss();
        onClose();
    };

    const openExternal = async (file: LocalMedia) => {
        try {
            const isAvailable = await Sharing.isAvailableAsync();

            if (!isAvailable) {
                Alert.alert('Erro', 'O compartilhamento de arquivos não está disponível neste dispositivo.');
                return;
            }

            await Sharing.shareAsync(file.localUrl, {
                mimeType: file.mimeType,
                dialogTitle: `Abrir ${file.name}`,
                UTI: file.mimeType,
            });

        } catch (error) {
            console.error('Erro ao abrir arquivo:', error);
            Alert.alert('Erro', 'Não foi possível encontrar um aplicativo para abrir este arquivo.');
        }
    };

    const viewerFile = files[viewerIndex] ?? null;
    if (!viewerFile) return null;

    const extension = (() => {
        const lastDot = viewerFile.name.lastIndexOf('.');
        return lastDot === -1 ? '' : viewerFile.name.slice(lastDot);
    })();

    const imageFiles = files.filter(isImage);
    const imageIndex = imageFiles.findIndex(f => f.serverId === viewerFile.serverId);
    const canGoPrev = viewerIndex > 0;
    const canGoNext = viewerIndex < files.length - 1;
    const imageUrls = imageFiles.map(f => ({ url: f.localUrl }));

    const renderContent = () => {
        if (isImage(viewerFile)) {
            return (
                <View style={StyleSheet.absoluteFill}>
                    <ImageViewer
                        imageUrls={imageUrls}
                        index={imageIndex >= 0 ? imageIndex : 0}
                        onChange={(index) => {
                            if (index === undefined) return;
                            const globalIndex = files.findIndex(
                                f => f.serverId === imageFiles[index]?.serverId
                            );
                            if (globalIndex !== -1) setViewerIndex(globalIndex);
                        }}
                        enableSwipeDown={!keyboardVisible}
                        onSwipeDown={handleClose}
                        onClick={() => {
                            if (keyboardVisible) Keyboard.dismiss();
                        }}
                        enablePreload
                        pageAnimateTime={300}
                        saveToLocalByLongPress={false}
                        useNativeDriver
                        backgroundColor="transparent"
                        renderIndicator={() => <View />}
                    />
                </View>
            );
        }

        if (isPdf(viewerFile)) {
            return (
                <View style={styles.pdfContainer}>
                    <Pdf
                        source={{ uri: viewerFile.localUrl, cache: true }}
                        style={styles.pdf}
                        onLoadComplete={(pages) => setPdfTotal(pages)}
                        onPageChanged={(page) => setPdfPage(page)}
                        onError={() => Alert.alert('Erro', 'Não foi possível carregar o PDF.')}
                        enablePaging
                        renderActivityIndicator={() => (
                            <ActivityIndicator size="large" color={colors.primary} />
                        )}
                    />
                    <View style={styles.pdfPageIndicator}>
                        <Text style={styles.pdfPageText}>{pdfPage} / {pdfTotal}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.openExternalContainer}>
                <View style={[styles.openExternalIcon, { backgroundColor: colors.primarySurface }]}>
                    <Ionicons name="document-outline" size={56} color={colors.primary} />
                </View>
                <Text style={styles.openExternalName} numberOfLines={2}>
                    {viewerFile.name}
                </Text>
                <Text style={styles.openExternalMeta}>
                    {formatSize(viewerFile.size)}
                </Text>
                <TouchableOpacity
                    style={[styles.openExternalButton, { backgroundColor: colors.primary }]}
                    onPress={() => openExternal(viewerFile)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="open-outline" size={18} color={colors.textOnPrimary} />
                    <Text style={[styles.openExternalButtonText, { color: colors.textOnPrimary }]}>
                        Abrir no app
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <View style={styles.viewer}>

                {(isImage(viewerFile) || isPdf(viewerFile)) && (
                    <>
                        <Image
                            source={{ uri: viewerFile.localUrl }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={24}
                        />
                        <View style={styles.viewerDim} />
                    </>
                )}

                {isOpenable(viewerFile) && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.modalBackground }]} />
                )}

                {renderContent()}

                {files.length > 1 && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {canGoPrev && (
                            <TouchableOpacity
                                style={[styles.viewerNav, styles.viewerNavLeft]}
                                onPress={() => setViewerIndex(v => v - 1)}
                                hitSlop={16}
                            >
                                <View style={styles.navInner}>
                                    <Ionicons name="chevron-back" size={24} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        )}
                        {canGoNext && (
                            <TouchableOpacity
                                style={[styles.viewerNav, styles.viewerNavRight]}
                                onPress={() => setViewerIndex(v => v + 1)}
                                hitSlop={16}
                            >
                                <View style={styles.navInner}>
                                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
                    pointerEvents="box-none"
                >
                    <View style={styles.contentContainer} pointerEvents="box-none">

                        <View style={styles.viewerHeader} pointerEvents="box-none">
                            <TouchableOpacity onPress={handleClose} hitSlop={12}>
                                <View style={styles.navInner}>
                                    <Ionicons name="close" size={22} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            {files.length > 1 && (
                                <Text style={styles.viewerCounter}>
                                    {viewerIndex + 1} / {files.length}
                                </Text>
                            )}
                        </View>

                        <View style={styles.viewerFooter} pointerEvents="box-none">
                            {keyboardVisible && (
                                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                    <View style={StyleSheet.absoluteFill} />
                                </TouchableWithoutFeedback>
                            )}
                            <View style={styles.nameRow} pointerEvents="box-none">
                                <TextInput
                                    style={styles.nameInput}
                                    value={editingName}
                                    onChangeText={setEditingName}
                                    onEndEditing={handleRename}
                                    onSubmitEditing={handleRename}
                                    editable={crud}
                                    selectTextOnFocus
                                    returnKeyType="done"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    autoCapitalize='none'
                                />
                                {!!extension && (
                                    <Text style={styles.nameExtension}>{extension}</Text>
                                )}
                            </View>
                            <Text style={styles.viewerMeta}>
                                {formatSize(viewerFile.size)}
                            </Text>
                        </View>
                    </View>
                </KeyboardAvoidingView>

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    viewer: {
        flex: 1,
        backgroundColor: '#000',
    },
    viewerDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 54 : 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        width: '100%',
    },
    navInner: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerCounter: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    viewerNav: {
        position: 'absolute',
        top: '50%',
        zIndex: 2,
        marginTop: -19,
    },
    viewerNavLeft: { left: 16 },
    viewerNavRight: { right: 16 },
    viewerFooter: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 20,
        gap: 8,
        position: 'relative',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        maxWidth: SCREEN_WIDTH * 0.85,
    },
    nameInput: {
        color: 'rgba(255,255,255,0.95)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        minWidth: 40,
        maxWidth: SCREEN_WIDTH * 0.55,
        padding: 0,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.4)',
    },
    nameExtension: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    viewerMeta: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 4,
    },
    pdfContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pdf: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    pdfPageIndicator: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 80,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pdfPageText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
    },
    openExternalContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 40,
    },
    openExternalIcon: {
        width: 100,
        height: 100,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    openExternalName: {
        color: 'rgba(255,255,255,0.95)',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    openExternalMeta: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
    openExternalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 8,
    },
    openExternalButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});