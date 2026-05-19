import React, { useEffect, useRef } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.67;
const DURATION = 280;

interface SidebarProps {
    visible: boolean;
    onClose: () => void;
    side?: 'left' | 'right';
    children: React.ReactNode;
}

export function Sidebar({ visible, onClose, side = 'left', children }: SidebarProps) {
    const { colors } = useTheme();

    const translateX = useRef(new Animated.Value(side === 'left' ? -SIDEBAR_WIDTH : SIDEBAR_WIDTH)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 200,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: DURATION,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: side === 'left' ? -SIDEBAR_WIDTH : SIDEBAR_WIDTH,
                    duration: DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: DURATION,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={[styles.overlay, side === 'right' && styles.overlayRight]}>
                {/* Overlay escuro */}
                <Animated.View
                    style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
                    pointerEvents="none"
                >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.modalOverlay }]} />
                </Animated.View>

                {/* Área clicável para fechar */}
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                {/* Conteúdo */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            backgroundColor: colors.sidebarBackground,
                            borderColor: colors.sidebarBorder,
                            transform: [{ translateX }],
                        },
                    ]}
                >
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    overlayRight: {
        justifyContent: 'flex-end',
    },
    content: {
        height: '100%',
        width: SIDEBAR_WIDTH,
        paddingTop: 56,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
});