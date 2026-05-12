import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Task from '@/src/database/model/Task';
import { TASK_PRIORITIES, TASK_STATUS } from '../constants/taskConstants';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Props {
    task: Task;
    isVisible: boolean;
    onClose: () => void;
}

export function EditTaskModal({ task, isVisible, onClose }: Props) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState(task.priority || '');
    const [status, setStatus] = useState(task.status);
    const [deadline, setDeadline] = useState<Date | null>(task.deadline ? new Date(task.deadline) : null);

    // Adicione estes para o scroll funcionar
    const scrollViewRef = useRef<ScrollView>(null);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority(task.priority || '');
            setStatus(task.status);
            setDeadline(task.deadline ? new Date(task.deadline) : null);
        }
    }, [isVisible, task]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (selectedDate) {
            setDeadline(selectedDate);
        }
    };

    const handleUpdate = async () => {
        if (!title) return;
        try {
            await task.database.write(async () => {
                await task.update((t) => {
                    t.title = title;
                    t.description = description;
                    t.priority = priority;
                    t.status = status || 'pending';
                    t.deadline = deadline ? new Date(deadline) : undefined;
                });
            });
            onClose();
        } catch (error) {
            console.error("Erro ao atualizar task:", error);
        }
    };

    return (
        <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={StyleSheet.absoluteFill}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                </TouchableWithoutFeedback>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'android' ? -60 : 0}
            >
                <View style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={onClose}>
                        <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>

                    <View style={styles.modalContainer}>
                        <ScrollView
                            ref={scrollViewRef}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 40 : 20 }}
                        >
                            <Text style={styles.modalTitle}>Editar Tarefa</Text>

                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Título"
                                placeholderTextColor="#666"
                            />

                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                placeholder="Descrição"
                                placeholderTextColor="#666"
                            />

                            <Text style={styles.label}>Prioridade</Text>
                            <View style={styles.priorityRow}>
                                {Object.values(TASK_PRIORITIES).map((p) => (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={[styles.priorityBtn, priority === p.value && styles.priorityBtnActive]}
                                        onPress={() => setPriority(priority === p.value ? '' : p.value)}
                                    >
                                        <Text style={styles.priorityBtnText}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Status</Text>
                            <View style={styles.priorityRow}>
                                {Object.values(TASK_STATUS).map((s) => (
                                    <TouchableOpacity
                                        key={s.value}
                                        style={[styles.priorityBtn, status === s.value && styles.priorityBtnActive]}
                                        onPress={() => setStatus(status === s.value ? '' : s.value)}
                                    >
                                        <Text style={styles.priorityBtnText}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Prazo</Text>
                            <View style={styles.dateSelectorContainer}>
                                <TouchableOpacity
                                    style={[styles.dateInput, { flex: 1 }]}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.dateInputContent}>
                                        <Ionicons name="calendar-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                        <Text style={{ color: deadline ? '#fff' : '#666', flex: 1 }}>
                                            {deadline ? deadline.toLocaleDateString('pt-BR') : 'Selecionar data'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.clearDateBtn}
                                    onPress={() => setDeadline(null)} // Aqui a mágica acontece
                                    activeOpacity={0.6}
                                >
                                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={deadline || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
                                <Text style={styles.saveText}>Salvar Alterações</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        backgroundColor: '#1a1a1a', // Dark card
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        width: '100%',
        borderWidth: 1,
        borderColor: '#333', // Borda sutil para dar profundidade
    },
    modalTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    label: {
        color: '#a1a1a1',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#0f0f0f',
        color: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 16,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 30,
    },
    priorityBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    priorityBtnActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    priorityBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    saveBtn: {
        backgroundColor: '#4f46e5',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 20 : 10, // Ajuste para o queixo do celular
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dateSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    dateInput: {
        backgroundColor: '#0f0f0f',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    dateInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clearDateBtn: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
});