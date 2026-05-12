import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput,TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { database } from '@/src/database';
import Subtask from '@/src/database/model/Subtask';
import { useAuth } from '@/src/contexts/AuthContext';

interface Props {
    taskId: string;
    subtaskCount: number;
    isVisible: boolean;
    onClose: () => void;
}

export function CreateSubtaskModal({ taskId, subtaskCount, isVisible, onClose }: Props) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [details, setDetails] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const handleSave = async () => {
        if (!name) return;

        try {
            await database.write(async () => {
                await database.get<Subtask>('subtasks').create(subtask => {
                    subtask.name = name;
                    subtask.details = details;
                    subtask.status = false;
                    subtask.order = subtaskCount;
                    subtask.serverId = `local-${Date.now()}`;
                    subtask.taskId = taskId;
                });
            });

            setName('');
            setDetails('');
        } catch (error) {
            console.error("Erro ao salvar subtask:", error);
        }
    };

    const handleClose = () => {
        setName('');
        setDetails('');
        onClose();
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={StyleSheet.absoluteFill}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} />
                </TouchableWithoutFeedback>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'android' ? -60 : 0}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <TouchableWithoutFeedback onPress={onClose}>
                        <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalContainer}>
                        <ScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            ref={scrollViewRef}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 30 : 0 }}
                        >
                            <Text style={styles.modalTitle}>Nova Subtarefa</Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Nova subtarefa..."
                                value={name}
                                onChangeText={setName}
                                blurOnSubmit={false}
                                onSubmitEditing={handleSave}
                                returnKeyType="next"
                            />

                            <TextInput
                                style={[styles.input, styles.detailsInput]}
                                placeholder="Detalhes"
                                multiline
                                numberOfLines={4}
                                value={details}
                                onChangeText={setDetails}
                                blurOnSubmit={false}
                                returnKeyType="done"
                            />

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                    <Text style={styles.saveText}>Criar Subtarefa</Text>
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
    modalContainer: {
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%'
    },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    input: { backgroundColor: '#0f0f0f', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
    actionRow: { flexDirection: 'row', gap: 15, marginTop: 'auto', paddingBottom: 20 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center' },
    cancelText: { color: '#ef4444', fontWeight: '600' },
    saveBtn: { flex: 2, backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: 'bold' },
    detailsInput: { height: 100, textAlignVertical: 'top' }
});