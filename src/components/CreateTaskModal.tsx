import { VALID_TASK_PRIORITIES, ValidTaskPriority } from '@/src/constants/taskConstants';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Category from '@/src/database/model/Category';
import Media from '@/src/database/model/Media';
import Task from '@/src/database/model/Task';
import TaskCategory from '@/src/database/model/TaskCategory';
import TaskMember from '@/src/database/model/TaskMember';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';
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
import { LocalMedia } from '../constants/mediaConstants';
import { useTaskNotification } from '../hooks/useNotification';
import { MapPickerModal } from './MapPickerModal';
import { MediaPicker } from './MediaPicker';
import { TaskCategoryPicker } from './TaskCategoryPicker';
import { TaskMemberEmailPicker, TaskMemberSelection } from './TaskMemberEmailPicker';
import { TaskRecurrenceSelector } from './TaskRecurrenceSelector';
import { VoiceTaskButton } from './VoiceTaskButton';
import { usePermissions } from '../hooks/usePermitions';
import {
    encodeWeekdays,
    normalizeRecurrenceStartDate,
    TaskRecurrenceType,
} from '@/src/utils/taskRecurrence';
import { touchForSync } from '@/src/utils/syncMetadata';
import { enqueueSyncAction } from '@/src/database/syncQueue';
import { taskPayload, toServerId } from '@/src/utils/syncPayloads';

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
    const [date, setDate] = useState<Date | null>(null);
    const [time, setTime] = useState<Date | null>(null);
    const [recurrenceType, setRecurrenceType] = useState<TaskRecurrenceType>('none');
    const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<TaskMemberSelection[]>([]);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [mediaList, setMediaList] = useState<LocalMedia[]>([]);
    const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const { scheduleDeadlineWarning, sendGeofenceNotification } = useTaskNotification();
    const { hasLocationPermission, hasNotificationPermission, requestNotificationPermission, requestLocationPermission, checkPermissions } = usePermissions();

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        if (!isVisible || !user?.id) return;

        const loadCategories = async () => {
            const rows = await database.get<Category>('categories').query().fetch();
            setCategories(rows.filter((category) => category.createdBy === user.id));
        };

        loadCategories().catch((error) => console.error('Erro ao carregar categorias:', error));
    }, [isVisible, user?.id]);

    const reset = () => {
        setTitle('');
        setDescription('');
        setPriority('');
        setDate(null);
        setTime(null);
        setRecurrenceType('none');
        setRecurrenceWeekdays([]);
        setSelectedCategoryIds([]);
        setSelectedMembers([]);
        setMediaList([]);
        setLocation(null);
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

        try {
            const recurrenceDate = normalizeRecurrenceStartDate(date, recurrenceType);
            const localDateStr = recurrenceDate ? format(recurrenceDate, 'yyyy-MM-dd') : undefined;
            const localTimeStr = time ? format(time, 'HH:mm') : undefined;
            const safeRecurrenceWeekdays = recurrenceType === 'weekdays'
                ? recurrenceWeekdays.length > 0 ? recurrenceWeekdays : [recurrenceDate?.getDay() ?? new Date().getDay()]
                : [];

            const deadlineForNotification = (() => {
                if (!date) return null;
                const combined = new Date(date);
                combined.setHours(
                    time ? time.getHours() : 0,
                    time ? time.getMinutes() : 0,
                    0, 0,
                );
                return combined;
            })();

            let newTaskId: string = '';
            let newTaskTitle = title.trim();
            let createdTask: Task | null = null;

            await database.write(async () => {
                const newTask = await database.get<Task>('tasks').create(task => {
                    task.title = newTaskTitle;
                    task.description = description;
                    task.priority = priority;
                    task.status = 'pending';
                    task.createdBy = user.id;
                    task.deadlineDate = localDateStr;
                    task.deadlineTime = localTimeStr;
                    task.recurrenceType = recurrenceType;
                    task.recurrenceWeekdays = encodeWeekdays(safeRecurrenceWeekdays);
                    task.serverId = Crypto.randomUUID();
                    touchForSync(task);
                    if (location) {
                        (task as any).latitude = location.latitude;
                        (task as any).longitude = location.longitude;
                        (task as any).address = location.address;
                    }
                });

                await database.get<TaskMember>('task_members').create(member => {
                    member.taskId = newTask.id;
                    member.userId = user.id;
                    member.userName = user.name;
                    touchForSync(member);
                });

                for (const selectedMember of selectedMembers) {
                    await database.get<TaskMember>('task_members').create(member => {
                        member.taskId = newTask.id;
                        member.userId = selectedMember.id;
                        member.userName = selectedMember.name;
                        touchForSync(member);
                    });
                }

                for (const categoryId of selectedCategoryIds) {
                    await database.get<TaskCategory>('task_categories').create((item) => {
                        item.taskId = newTask.id;
                        item.categoryId = categoryId;
                        touchForSync(item);
                    });
                }

                for (const m of mediaList) {
                    await database.get<Media>('media').create(media => {
                        media.serverId = m.serverId;
                        media.name = m.name;
                        media.url = m.url;
                        media.mime_type = m.mimeType;
                        media.type = m.type;
                        media.size = m.size;
                        media.taskId = newTask.id;
                        touchForSync(media);
                    });
                }

                newTaskId = newTask.id;
                createdTask = newTask;
            });

            if (createdTask) {
                const nextTaskPayload = taskPayload(createdTask);
                const categoryIds = selectedCategoryIds
                    .map((id) => categories.find((category) => category.id === id))
                    .filter(Boolean)
                    .map((category) => toServerId(category as Category));

                await enqueueSyncAction('task.create', {
                    task: nextTaskPayload,
                    categoryIds,
                    memberIds: selectedMembers.map((member) => member.id),
                    members: selectedMembers.map((member) => ({
                        id: member.id,
                        name: member.name,
                        email: member.email,
                    })),
                    media: mediaList.map((item) => ({
                        id: item.serverId || Crypto.randomUUID(),
                        taskId: nextTaskPayload.id,
                        name: item.name,
                        url: item.url,
                        mimeType: item.mimeType,
                        type: item.type,
                        size: item.size,
                        updatedAt: new Date().toISOString(),
                    })),
                });
            }

            if (deadlineForNotification && hasNotificationPermission) {
                await scheduleDeadlineWarning(newTaskId, newTaskTitle, deadlineForNotification, 60);
                await scheduleDeadlineWarning(newTaskId, newTaskTitle, deadlineForNotification, 24 * 60);
            }

            const permissionSnapshot = location ? await checkPermissions() : null;
            if (location && permissionSnapshot?.location && permissionSnapshot.notification) {
                await sendGeofenceNotification(
                    newTaskId,
                    newTaskTitle,
                    location.latitude,
                    location.longitude,
                );
            }

            reset();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar task:', error);
        }
    };

    const handleVoiceParsed = (parsed: any) => {
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.priority) setPriority(parsed.priority);
        if (parsed.date) setDate(parsed.date);
        if (parsed.time) setTime(parsed.time);
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

                            <View style={styles.relationsRow}>
                                <View style={styles.relationColumn}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Categorias</Text>
                                    <TaskCategoryPicker
                                        categories={categories}
                                        selectedCategoryIds={selectedCategoryIds}
                                        onChange={setSelectedCategoryIds}
                                    />
                                </View>
                                <View style={styles.relationColumn}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Membros</Text>
                                    <TaskMemberEmailPicker
                                        selectedMembers={selectedMembers}
                                        currentUserId={user?.id}
                                        onChange={setSelectedMembers}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Recorrência</Text>
                            <TaskRecurrenceSelector
                                recurrenceType={recurrenceType}
                                selectedWeekdays={recurrenceWeekdays}
                                anchorDate={date}
                                onChangeType={(type) => {
                                    setRecurrenceType(type);
                                    if (type !== 'weekdays') setRecurrenceWeekdays([]);
                                    if (type === 'weekdays' && recurrenceWeekdays.length === 0) {
                                        setRecurrenceWeekdays([date?.getDay() ?? new Date().getDay()]);
                                    }
                                }}
                                onChangeWeekdays={setRecurrenceWeekdays}
                            />

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Data e hora</Text>
                            <View style={styles.datetimeContainer}>
                                <View style={styles.datetimeRow}>
                                    <TouchableOpacity
                                        style={[styles.datetimeInput, {
                                            flex: 1,
                                            backgroundColor: colors.inputBackground,
                                            borderColor: date ? colors.primary : colors.inputBorder,
                                        }]}
                                        onPress={async () => {
                                            if (!hasNotificationPermission) {
                                                await requestNotificationPermission();
                                            }
                                            setShowDatePicker(true);
                                        }}
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
                                        onPress={() => {
                                            if (!date) setDate(new Date());
                                            setShowTimePicker(true);
                                        }}
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

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Localização (Geofencing)</Text>
                            <TouchableOpacity
                                style={[styles.datetimeInput, {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: location ? colors.primary : colors.inputBorder,
                                    marginBottom: 14
                                }]}
                                onPress={async () => {
                                    if (!hasLocationPermission) {
                                        await requestLocationPermission();
                                    }
                                    if (!hasNotificationPermission) {
                                        await requestNotificationPermission();
                                    }
                                    setShowMapPicker(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="location-outline" size={18} color={location ? colors.primary : colors.inputPlaceholder} />
                                <Text style={{ color: location ? colors.text : colors.inputPlaceholder, flex: 1, marginLeft: 10, fontSize: 15 }} numberOfLines={1}>
                                    {location ? location.address || 'Local selecionado' : 'Selecionar no mapa'}
                                </Text>
                                {location && (
                                    <TouchableOpacity style={[styles.clearBtn, { width: 24, height: 24 }]} onPress={() => setLocation(null)} activeOpacity={0.7}>
                                        <Ionicons name="close" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>

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

                                <VoiceTaskButton onParsed={handleVoiceParsed} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <MapPickerModal
                isVisible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onSelect={(loc) => {
                    setLocation(loc);
                    setShowMapPicker(false);
                }}
                initialLocation={location}
            />
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
    relationsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 2,
    },
    relationColumn: {
        flex: 1,
        minWidth: 150,
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
        flex: 1,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveText: {
        fontWeight: '700',
        fontSize: 15,
    },
});
