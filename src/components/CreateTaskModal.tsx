import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { useAuth } from '@/src/contexts/AuthContext';
import { TASK_PRIORITIES } from '../constants/taskConstants';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import TaskMember from '../database/model/TaskMember';

interface Props {
    isVisible: boolean;
    onClose: () => void;
}

export function CreateTaskModal({ isVisible, onClose }: Props) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('');
    const [deadline, setDeadline] = useState<Date | null>(null);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

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

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (selectedDate) {
            setDeadline(selectedDate);
        }
    };

    const handleSave = async () => {
        if (!title) return;
        if (!user?.id) throw new Error("Usuário não autenticado");

        try {
            await database.write(async () => {
                const newTask = await database.get<Task>('tasks').create(task => {
                    task.title = title;
                    task.description = description;
                    task.priority = priority;
                    task.status = 'pending';
                    task.createdBy = user?.id || 'anonymous';
                    task.deadline = deadline ? new Date(deadline) : undefined;
                    task.serverId = `local-${Date.now()}`;
                });
                await database.get<TaskMember>('task_members').create(member => {
                    member.taskId = newTask.id;
                    member.userId = user?.id;
                    member.userName = user?.name;
                });
            });

            // Limpa e fecha
            setTitle('');
            setDescription('');
            setPriority('');
            setDeadline(null);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar task:", error);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setPriority('');
        setDeadline(null);
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
                            <Text style={styles.modalTitle}>Nova Tarefa</Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Título"
                                placeholderTextColor="#666"
                                value={title}
                                onChangeText={setTitle}
                                returnKeyType='next'
                            />

                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Descrição"
                                placeholderTextColor="#666"
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                                returnKeyType='done'
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

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                    <Text style={styles.saveText}>Criar Tarefa</Text>
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContainer: {
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%'
    },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    label: { color: '#a1a1a1', fontSize: 14, marginBottom: 10, marginTop: 10 },
    input: { backgroundColor: '#0f0f0f', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
    textArea: { height: 100, textAlignVertical: 'top' },
    priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    priorityBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    priorityBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    priorityBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    actionRow: { flexDirection: 'row', gap: 15, marginTop: 'auto', paddingBottom: 20 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center' },
    cancelText: { color: '#ef4444', fontWeight: '600' },
    saveBtn: { flex: 2, backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: 'bold' },
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