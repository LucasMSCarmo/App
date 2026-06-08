import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { database } from '@/src/database';
import Subtask from '@/src/database/model/Subtask';
import Task from '@/src/database/model/Task';
import { useTheme } from '@/src/contexts/ThemeContext';
import * as Crypto from 'expo-crypto';
import { touchForSync } from '@/src/utils/syncMetadata';
import { enqueueSyncAction } from '@/src/database/syncQueue';
import { subtaskPayload } from '@/src/utils/syncPayloads';

interface Props {
    taskId: string;
    task?: Task;
    subtaskCount: number;
    isVisible: boolean;
    onClose: () => void;
}

export function CreateSubtaskModal({ taskId, task, subtaskCount, isVisible, onClose }: Props) {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [details, setDetails] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const reset = () => { setName(''); setDetails(''); };

    const handleClose = () => { reset(); onClose(); };

    const handleSave = async () => {
        if (!name.trim()) return;
        try {
            let createdSubtask: Subtask | null = null;
            await database.write(async () => {
                createdSubtask = await database.get<Subtask>('subtasks').create(subtask => {
                    subtask.name = name.trim();
                    subtask.details = details;
                    subtask.status = false;
                    subtask.order = subtaskCount;
                    subtask.serverId = Crypto.randomUUID();
                    subtask.taskId = taskId;
                    touchForSync(subtask);
                });
            });
            if (createdSubtask) {
                await enqueueSyncAction('subtask.create', {
                    subtask: subtaskPayload(createdSubtask, task),
                });
            }
            reset();
        } catch (error) {
            console.error('Erro ao salvar subtask:', error);
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={StyleSheet.absoluteFill}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={{ flex: 1, backgroundColor: colors.modalOverlay }} />
                </TouchableWithoutFeedback>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'android' ? -60 : 0}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>

                    <View style={[styles.sheet, { backgroundColor: colors.modalBackground, borderColor: colors.modalBorder }]}>
                        <View style={[styles.handle, { backgroundColor: colors.modalHandle }]} />

                        <ScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            ref={scrollViewRef}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 30 : 0 }}
                        >
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Subtarefa</Text>

                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                }]}
                                placeholder="Nome da subtarefa..."
                                placeholderTextColor={colors.inputPlaceholder}
                                value={name}
                                onChangeText={setName}
                                blurOnSubmit={false}
                                onSubmitEditing={handleSave}
                                returnKeyType="next"
                            />

                            <TextInput
                                style={[styles.input, styles.detailsInput, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                }]}
                                placeholder="Detalhes (opcional)"
                                placeholderTextColor={colors.inputPlaceholder}
                                multiline
                                numberOfLines={4}
                                value={details}
                                onChangeText={setDetails}
                                blurOnSubmit={false}
                                returnKeyType="done"
                            />

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                                    onPress={handleClose}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.saveBtn,
                                        { backgroundColor: name.trim() ? colors.buttonPrimary : colors.buttonDisabled },
                                    ]}
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                    disabled={!name.trim()}
                                >
                                    <Text style={[styles.saveText, { color: name.trim() ? colors.buttonPrimaryText : colors.buttonDisabledText }]}>
                                        Criar Subtarefa
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheet: {
        padding: 20,
        paddingTop: 12,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
        maxHeight: '85%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
        letterSpacing: -0.3,
    },
    input: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: 15,
    },
    detailsInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
        paddingBottom: 20,
    },
    cancelBtn: {
        flex: 1,
        padding: 15,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    cancelText: {
        fontWeight: '600',
        fontSize: 15,
    },
    saveBtn: {
        flex: 2,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveText: {
        fontWeight: '700',
        fontSize: 15,
    },
});
