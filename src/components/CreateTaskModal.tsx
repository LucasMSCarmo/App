import { VALID_TASK_PRIORITIES, ValidTaskPriority } from '@/src/constants/taskConstants';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import Media from '@/src/database/model/Media';
import TaskMember from '@/src/database/model/TaskMember';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { MediaPicker } from './MediaPicker';
import { LocalMedia } from '../constants/mediaConstants';

interface Props {
    isVisible: boolean;
    onClose: () => void;
}

export function CreateTaskModal({ isVisible, onClose }: Props) {
    const { user } = useAuth();
    const { colors } = useTheme();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<ValidTaskPriority>('');
    const [date, setDate] = useState<Date | null>(new Date());
    const [time, setTime] = useState<Date | null>(null);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [mediaList, setMediaList] = useState<LocalMedia[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const reset = () => {
        setTitle('');
        setDescription('');
        setPriority('');
        setDate(null);
        setTime(null);
        setMediaList([]);
    };

    const handleClose = () => { reset(); onClose(); };

    const onDateChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (_: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) setTime(selectedTime);
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        if (!user?.id) throw new Error('Usuário não autenticado');

        const deadline = (() => {
            if (date) {
                if (time) {
                    const combined = new Date(date);
                    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    return combined;
                }
                return date;
            }
            return null;
        })();

        try {
            await database.write(async () => {
                const newTask = await database.get<Task>('tasks').create(task => {
                    task.title = title.trim();
                    task.description = description;
                    task.priority = priority;
                    task.status = 'pending';
                    task.createdBy = user.id;
                    task.deadline = deadline ?? undefined;
                    task.serverId = Crypto.randomUUID();
                });

                await database.get<TaskMember>('task_members').create(member => {
                    member.taskId = newTask.id;
                    member.userId = user.id;
                    member.userName = user.name;
                });

                for (const m of mediaList) {
                    await database.get<Media>('media').create(media => {
                        media.serverId = m.serverId;
                        media.name = m.name;
                        media.url = m.url;
                        media.mime_type = m.mimeType;
                        media.type = m.type;
                        media.size = m.size;
                        media.taskId = newTask.id;
                    });
                }
            });

            reset();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar task:', error);
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={handleClose}>
            {/* Overlay */}
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
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Tarefa</Text>

                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                }]}
                                placeholder="Título"
                                placeholderTextColor={colors.inputPlaceholder}
                                value={title}
                                onChangeText={setTitle}
                                returnKeyType="next"
                            />

                            <TextInput
                                style={[styles.input, styles.textArea, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                }]}
                                placeholder="Descrição (opcional)"
                                placeholderTextColor={colors.inputPlaceholder}
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                                returnKeyType="done"
                            />

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Prioridade</Text>
                            <View style={styles.priorityRow}>
                                {Object.values(VALID_TASK_PRIORITIES).map((p) => {
                                    const isActive = priority === p.value;
                                    const activeColor = colors[p.colorKey];
                                    const activeSurface = colors[p.surfaceKey];
                                    return (
                                        <TouchableOpacity
                                            key={p.value}
                                            style={[
                                                styles.priorityBtn,
                                                { borderColor: colors.border, backgroundColor: colors.surface },
                                                isActive && { backgroundColor: activeSurface, borderColor: activeColor + '60' },
                                            ]}
                                            onPress={() => setPriority((priority === p.value ? '' : p.value as ValidTaskPriority))}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.priorityDot, { backgroundColor: activeColor }]} />
                                            <Text style={[styles.priorityBtnText, { color: isActive ? activeColor : colors.textSecondary }]}>
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Data e hora</Text>
                            <View style={styles.datetimeContainer}>
                                <View style={styles.datetimeRow}>
                                    <TouchableOpacity
                                        style={[styles.datetimeInput, {
                                            flex: 1,
                                            backgroundColor: colors.inputBackground,
                                            borderColor: date ? colors.primary : colors.inputBorder,
                                        }]}
                                        onPress={() => setShowDatePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="calendar-outline" size={18} color={date ? colors.primary : colors.inputIcon} />
                                        <Text style={{ color: date ? colors.text : colors.inputPlaceholder, flex: 1, marginLeft: 10, fontSize: 15 }}>
                                            {date ? date.toLocaleDateString('pt-BR') : 'Selecionar data'}
                                        </Text>
                                    </TouchableOpacity>

                                    {date && (
                                        <TouchableOpacity
                                            style={[styles.clearBtn, { backgroundColor: colors.buttonCancel }]}
                                            onPress={() => { setDate(null); setTime(null); }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="close" size={18} color={time ? colors.danger : colors.inputIcon} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.datetimeRow}>
                                    <TouchableOpacity
                                        style={[styles.datetimeInput, {
                                            flex: 1,
                                            backgroundColor: colors.inputBackground,
                                            borderColor: time ? colors.primary : colors.inputBorder,
                                        }]}
                                        onPress={() => setShowTimePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="time-outline" size={18} color={!date ? colors.inputIcon : colors.primary} />
                                        <Text style={{ color: !date ? colors.inputPlaceholder : colors.text, flex: 1, marginLeft: 10, fontSize: 15 }}>
                                            {time ? time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Selecionar hora'}
                                        </Text>
                                    </TouchableOpacity>

                                    {time && (
                                        <TouchableOpacity
                                            style={[styles.clearBtn, { backgroundColor: colors.buttonCancel }]}
                                            onPress={() => setTime(null)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="close" size={18} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}
                            {showTimePicker && (
                                <DateTimePicker
                                    value={time || new Date()}
                                    mode="time"
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}

                            {/* MediaPicker — só seleciona, passa payload para cima */}
                            <MediaPicker
                                onChangeMedia={setMediaList}
                                maxFiles={10}
                            />

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: title.trim() ? colors.buttonPrimary : colors.buttonDisabled }]}
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                    disabled={!title.trim()}
                                >
                                    <Text style={[styles.saveText, { color: title.trim() ? colors.buttonPrimaryText : colors.buttonDisabledText }]}>
                                        Criar Tarefa
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
        height: 100,
        textAlignVertical: 'top',
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    priorityBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
    },
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    priorityBtnText: {
        fontSize: 12,
        fontWeight: '500',
    },
    datetimeContainer: {
        flexDirection: 'column',
    },
    datetimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    datetimeInput: {
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
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
        paddingBottom: 20,
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