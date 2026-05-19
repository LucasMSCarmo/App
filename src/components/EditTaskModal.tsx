import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import Task from '@/src/database/model/Task';
import { VALID_TASK_PRIORITIES, TASK_STATUS, TaskStatus, ValidTaskPriority } from '../constants/taskConstants';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Props {
    task: Task;
    isVisible: boolean;
    onClose: () => void;
}

export function EditTaskModal({ task, isVisible, onClose }: Props) {
    const { colors } = useTheme();

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState<ValidTaskPriority>(task.priority as ValidTaskPriority);
    const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
    const [deadline, setDeadline] = useState<Date | null>(task.deadline ? new Date(task.deadline) : null);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (isVisible) {
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority(task.priority as ValidTaskPriority);
            setStatus(task.status as TaskStatus);
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

    const onDateChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDeadline(selectedDate);
    };

    const handleUpdate = async () => {
        if (!title.trim()) return;
        try {
            await task.database.write(async () => {
                await task.update((t) => {
                    t.title = title.trim();
                    t.description = description;
                    t.priority = priority;
                    t.status = status || 'pending';
                    t.deadline = deadline ? new Date(deadline) : undefined;
                });
            });
            onClose();
        } catch (error) {
            console.error('Erro ao atualizar task:', error);
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            {/* Overlay */}
            <View style={StyleSheet.absoluteFill}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={{ flex: 1, backgroundColor: colors.modalOverlay }} />
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

                    <View style={[styles.sheet, { backgroundColor: colors.modalBackground, borderColor: colors.modalBorder }]}>
                        {/* Handle */}
                        <View style={[styles.handle, { backgroundColor: colors.modalHandle }]} />

                        <ScrollView
                            ref={scrollViewRef}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 40 : 20 }}
                        >
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Tarefa</Text>

                            {/* Título */}
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Título"
                                placeholderTextColor={colors.inputPlaceholder}
                                returnKeyType="next"
                            />

                            {/* Descrição */}
                            <TextInput
                                style={[styles.input, styles.textArea, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                }]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                placeholder="Descrição (opcional)"
                                placeholderTextColor={colors.inputPlaceholder}
                                returnKeyType="done"
                            />

                            {/* Prioridade */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Prioridade</Text>
                            <View style={styles.optionRow}>
                                {Object.values(VALID_TASK_PRIORITIES).map((p) => {
                                    const isActive = priority === p.value;
                                    const activeColor = colors[p.colorKey];
                                    const activeSurface = colors[p.surfaceKey];

                                    return (
                                        <TouchableOpacity
                                            key={p.value}
                                            style={[
                                                styles.optionBtn,
                                                { borderColor: colors.border, backgroundColor: colors.surface },
                                                isActive && { backgroundColor: activeSurface, borderColor: activeColor + '60' },
                                            ]}
                                            onPress={() => setPriority((priority === p.value ? '' : p.value) as ValidTaskPriority)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.optionText,
                                                { color: isActive ? activeColor : colors.textSecondary },
                                                isActive && styles.optionTextActive,
                                            ]}>
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Status */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
                            <View style={styles.optionRow}>
                                {Object.values(TASK_STATUS).map((s) => {
                                    const isActive = status === s.value;
                                    const activeColor = colors[s.colorKey];
                                    const activeSurface = colors[s.surfaceKey];

                                    return (
                                        <TouchableOpacity
                                            key={s.value}
                                            style={[
                                                styles.optionBtn,
                                                { borderColor: colors.border, backgroundColor: colors.surface },
                                                isActive && { backgroundColor: activeSurface, borderColor: activeColor + '60' },
                                            ]}
                                            onPress={() => setStatus(s.value)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.optionText,
                                                { color: isActive ? activeColor : colors.textSecondary },
                                                isActive && styles.optionTextActive,
                                            ]}>
                                                {s.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Prazo */}
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Prazo</Text>
                            <View style={styles.dateRow}>
                                <TouchableOpacity
                                    style={[styles.dateInput, {
                                        flex: 1,
                                        backgroundColor: colors.inputBackground,
                                        borderColor: deadline ? colors.primary : colors.inputBorder,
                                    }]}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={18}
                                        color={deadline ? colors.primary : colors.inputIcon}
                                    />
                                    <Text style={{ color: deadline ? colors.text : colors.inputPlaceholder, flex: 1, marginLeft: 10, fontSize: 15 }}>
                                        {deadline ? deadline.toLocaleDateString('pt-BR') : 'Selecionar data'}
                                    </Text>
                                </TouchableOpacity>

                                {deadline && (
                                    <TouchableOpacity
                                        style={[styles.clearBtn, { backgroundColor: colors.buttonCancel }]}
                                        onPress={() => setDeadline(null)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
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

                            {/* Salvar */}
                            <TouchableOpacity
                                style={[
                                    styles.saveBtn,
                                    { backgroundColor: title.trim() ? colors.buttonPrimary : colors.buttonDisabled },
                                ]}
                                onPress={handleUpdate}
                                activeOpacity={0.8}
                                disabled={!title.trim()}
                            >
                                <Text style={[styles.saveText, { color: title.trim() ? colors.buttonPrimaryText : colors.buttonDisabledText }]}>
                                    Salvar Alterações
                                </Text>
                            </TouchableOpacity>
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
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: 15,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    optionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        minWidth: 70,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    optionText: {
        fontSize: 12,
        fontWeight: '500',
    },
    optionTextActive: {
        fontWeight: '700',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    clearBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtn: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 10 : 0,
    },
    saveText: {
        fontSize: 15,
        fontWeight: '700',
    },
});