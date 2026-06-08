import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { database } from '@/src/database';
import Category from '@/src/database/model/Category';
import Task from '@/src/database/model/Task';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { TASK_STATUS, TaskStatus, VALID_TASK_PRIORITIES, ValidTaskPriority } from '../constants/taskConstants';
import { MapPickerModal } from './MapPickerModal';
import { TaskCategoryPicker } from './TaskCategoryPicker';
import { TaskMemberEmailPicker, TaskMemberSelection } from './TaskMemberEmailPicker';
import { TaskRecurrenceSelector } from './TaskRecurrenceSelector';
import { useTaskNotification } from '../hooks/useNotification';
import { usePermissions } from '../hooks/usePermitions';
import {
    encodeWeekdays,
    normalizeRecurrenceStartDate,
    parseWeekdays,
    TaskRecurrenceType,
} from '@/src/utils/taskRecurrence';
import { touchForSync } from '@/src/utils/syncMetadata';
import { replaceTaskCategories } from '@/src/utils/taskRelations';
import { applyTaskStatus } from '@/src/utils/taskCompletion';
import { enqueueSyncAction } from '@/src/database/syncQueue';
import { taskPayload, toServerId } from '@/src/utils/syncPayloads';
import TaskMember from '@/src/database/model/TaskMember';
import { taskService } from '@/src/services/taskService';

interface Props {
    task: Task;
    isVisible: boolean;
    onClose: () => void;
}

export function EditTaskModal({ task, isVisible, onClose }: Props) {
    const { user } = useAuth();
    const { colors } = useTheme();

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState<ValidTaskPriority>(task.priority as ValidTaskPriority);
    const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
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
    const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const { scheduleDeadlineWarning, sendGeofenceNotification, cancelTaskNotifications } = useTaskNotification();
    const { hasLocationPermission, hasNotificationPermission, requestNotificationPermission, requestLocationPermission, checkPermissions } = usePermissions();

    useEffect(() => {
        if (isVisible) {
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority(task.priority as ValidTaskPriority);
            setStatus(task.status as TaskStatus);
            setRecurrenceType((task.recurrenceType || 'none') as TaskRecurrenceType);
            setRecurrenceWeekdays(parseWeekdays(task.recurrenceWeekdays));

            if (task.deadlineDate) {
                const [y, m, d] = task.deadlineDate.split('-');
                setDate(new Date(+y, +m - 1, +d));
            } else {
                setDate(null);
            }

            if (task.deadlineTime) {
                const d = new Date();
                const [h, min] = task.deadlineTime.split(':');
                d.setHours(+h, +min, 0, 0);
                setTime(d);
            } else {
                setTime(null);
            }

            const taskAny = task as any;
            if (taskAny.latitude && taskAny.longitude) {
                setLocation({
                    latitude: taskAny.latitude,
                    longitude: taskAny.longitude,
                    address: taskAny.address || ''
                });
            } else {
                setLocation(null);
            }

            const loadRelations = async () => {
                const [storedCategories, taskCategories, taskMembers] = await Promise.all([
                    database.get<Category>('categories').query().fetch(),
                    task.categories.fetch(),
                    task.members.fetch(),
                ]);

                setCategories(storedCategories.filter((category) => category.createdBy === user?.id));
                setSelectedCategoryIds(taskCategories.map((category: Category) => category.id));
                setSelectedMembers(
                    taskMembers
                        .filter((member: TaskMember) => member.userId !== task.createdBy)
                        .map((member: TaskMember) => ({
                            id: member.userId,
                            name: member.userName,
                        })),
                );
            };

            loadRelations().catch((error) => console.error('Erro ao carregar relações:', error));
        }
    }, [isVisible, task, user?.id, user?.name]);

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
        if (selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (_: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) setTime(selectedTime);
    };

    const applyOnlineMemberChanges = async () => {
        const currentMembers = await task.members.fetch() as TaskMember[];
        const currentExtraMembers = currentMembers.filter((member) => member.userId !== task.createdBy);
        const currentIds = new Set(currentExtraMembers.map((member) => member.userId));
        const selectedIds = new Set(selectedMembers.map((member) => member.id));

        const added = selectedMembers.filter((member) => !currentIds.has(member.id));
        const removed = currentExtraMembers.filter((member) => !selectedIds.has(member.userId));

        if (added.length === 0 && removed.length === 0) return;

        if (!task.serverId) {
            throw new Error('Sincronize a tarefa antes de alterar membros.');
        }

        const taskId = toServerId(task);
        await Promise.all([
            ...added.map((member) => taskService.addMember(taskId, member.id)),
            ...removed.map((member) => taskService.removeMember(taskId, member.userId)),
        ]);

        await task.database.write(async () => {
            for (const member of removed) {
                await member.markAsDeleted();
            }

            for (const member of added) {
                await task.collections.get<TaskMember>('task_members').create((record) => {
                    record.taskId = task.id;
                    record.userId = member.id;
                    record.userName = member.name;
                    touchForSync(record);
                });
            }
        });
    };

    const handleUpdate = async () => {
        if (!title.trim()) return;
        try {
            await applyOnlineMemberChanges();

            const recurrenceDate = normalizeRecurrenceStartDate(date, recurrenceType);
            const localDateStr = recurrenceDate ? format(recurrenceDate, 'yyyy-MM-dd') : undefined;
            const localTimeStr = time ? format(time, 'HH:mm') : undefined;
            const safeRecurrenceWeekdays = recurrenceType === 'weekdays'
                ? recurrenceWeekdays.length > 0 ? recurrenceWeekdays : [recurrenceDate?.getDay() ?? new Date().getDay()]
                : [];

            await task.database.write(async () => {
                await task.update((t) => {
                    t.title = title.trim();
                    t.description = description;
                    t.priority = priority;
                    applyTaskStatus(t, status || 'pending');
                    t.deadlineDate = localDateStr;
                    t.deadlineTime = localTimeStr;
                    t.recurrenceType = recurrenceType;
                    t.recurrenceWeekdays = encodeWeekdays(safeRecurrenceWeekdays);
                    touchForSync(t);
                    if (location) {
                        (t as any).latitude = location.latitude;
                        (t as any).longitude = location.longitude;
                        (t as any).address = location.address;
                    } else {
                        (t as any).latitude = null;
                        (t as any).longitude = null;
                        (t as any).address = null;
                    }
                });

                await replaceTaskCategories(task, selectedCategoryIds);
            });

            const categoryIds = selectedCategoryIds
                .map((id) => categories.find((category) => category.id === id))
                .filter(Boolean)
                .map((category) => toServerId(category as Category));

            await enqueueSyncAction('task.update', {
                task: taskPayload(task),
                categoryIds,
            });

            await cancelTaskNotifications(task.id);

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

            if (deadlineForNotification && hasNotificationPermission) {
                await scheduleDeadlineWarning(task.id, title.trim(), deadlineForNotification, 60);
                await scheduleDeadlineWarning(task.id, title.trim(), deadlineForNotification, 24 * 60);
            }

            const permissionSnapshot = location ? await checkPermissions() : null;
            if (location && permissionSnapshot?.location && permissionSnapshot.notification) {
                await sendGeofenceNotification(
                    task.id,
                    title.trim(),
                    location.latitude,
                    location.longitude,
                );
            }

            onClose();
        } catch (error) {
            const message = (error as any)?.response?.data?.message
                ?? (error as any)?.message
                ?? 'Não foi possível atualizar a tarefa.';
            Alert.alert('Erro', message);
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
                                        disabled={!task.serverId}
                                        disabledMessage="Sincronize a tarefa antes de alterar membros."
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

                            {/* Prazo */}
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
