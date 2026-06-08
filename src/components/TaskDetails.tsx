import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import Task from '@/src/database/model/Task';
import Media from '@/src/database/model/Media';
import Subtask from '@/src/database/model/Subtask';
import TaskMember from '@/src/database/model/TaskMember';
import Comment from '@/src/database/model/Comment';
import { useRouter } from 'expo-router';
import { EditTaskModal } from '@/src/components/EditTaskModal';
import { Category } from '../types/models/category.type';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { CreateSubtaskModal } from '@/src/components/CreateSubtaskModal';
import { Q } from '@nozbe/watermelondb';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SubtaskItem from '@/src/components/SubtaskItem';
import { TaskMembersManager } from '@/src/components/TaskMemberManager';
import TaskStatusSelector from '@/src/components/TaskStatusSelector';
import { TaskPriority, TaskStatus } from '@/src/constants/taskConstants';
import TaskPriorityBadge from '@/src/components/TaskPriorityBadge';
import { MediaPreview } from '@/src/components/MediaPreview';
import { LocalMedia, MediaType } from '../constants/mediaConstants';
import RNFS from 'react-native-fs';
import { useTaskNotification } from '../hooks/useNotification';
import { addSyncTombstone, markDeletedForSync, nowForSync, touchForSync } from '@/src/utils/syncMetadata';
import { enqueueSyncAction } from '@/src/database/syncQueue';
import { commentPayload, subtaskPayload, taskPayload, toServerId } from '@/src/utils/syncPayloads';
import { applyTaskStatus } from '@/src/utils/taskCompletion';
import { useProximityGesture } from '@/src/hooks/useProximityGesture';

// ─── Progress Bar ────────────────────────────────────────────────────────────

const ProgressBar = ({ completed, total, colors }: { completed: number; total: number; colors: any }) => {
    const progress = total > 0 ? completed / total : 0;
    const widthAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: progress,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [progress, widthAnim]);

    return (
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
            <Animated.View
                style={[
                    styles.progressFill,
                    {
                        backgroundColor: progress === 1 ? colors.success : colors.primary,
                        width: widthAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                        }),
                    },
                ]}
            />
        </View>
    );
};

const getDirPath = (category: MediaType) =>
    `${RNFS.DocumentDirectoryPath}/${category}/`;

const TaskComments = ({
    task,
    comments,
    colors,
    userId,
    userName,
    visible,
    onClose,
}: {
    task: Task;
    comments: Comment[];
    colors: any;
    userId: string;
    userName: string;
    visible: boolean;
    onClose: () => void;
}) => {
    const [body, setBody] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSend = async () => {
        const trimmed = body.trim();
        if (!trimmed || !userId || isSaving) return;

        setIsSaving(true);
        setBody('');
        let localComment: Comment | null = null;

        try {
            await task.database.write(async () => {
                localComment = await task.collections.get<Comment>('comments').create((comment) => {
                    comment.serverId = Crypto.randomUUID();
                    comment.taskId = task.id;
                    comment.userId = userId;
                    comment.userName = userName;
                    comment.body = trimmed;
                    touchForSync(comment);
                });
            });

            if (localComment) {
                await enqueueSyncAction('comment.create', {
                    comment: commentPayload(localComment, task),
                });
            }
        } catch (error) {
            console.error('Erro ao salvar comentário:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={styles.commentModalKeyboard}
                keyboardVerticalOffset={Platform.OS === 'android' ? -40 : 0}
            >
                <View style={[styles.commentSheet, { backgroundColor: colors.modalBackground, borderColor: colors.modalBorder }]}>
                    <View style={[styles.commentHandle, { backgroundColor: colors.modalHandle }]} />
                    <View style={styles.commentModalHeader}>
                        <Text style={[styles.commentModalTitle, { color: colors.text }]}>
                            Comentários ({comments.length})
                        </Text>
                        <TouchableOpacity onPress={onClose} hitSlop={styles.hitSlop}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.commentsList} showsVerticalScrollIndicator={false}>
                        {comments.length === 0 ? (
                            <View style={[styles.emptyComment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textMuted} />
                                <Text style={[styles.emptyCommentText, { color: colors.textMuted }]}>
                                    Nenhum comentário ainda
                                </Text>
                            </View>
                        ) : (
                            comments.map((comment) => (
                                <View key={comment.id} style={[styles.commentBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.commentHeader}>
                                        <Text style={[styles.commentAuthor, { color: colors.text }]} numberOfLines={1}>
                                            {comment.userName}
                                        </Text>
                                        <Text style={[styles.commentDate, { color: colors.textMuted }]}>
                                            {comment.createdAt.toLocaleDateString('pt-BR')}
                                        </Text>
                                    </View>
                                    <Text style={[styles.commentBody, { color: colors.textSecondary }]}>
                                        {comment.body}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.commentInputRow}>
                        <TextInput
                            value={body}
                            onChangeText={setBody}
                            placeholder="Escrever comentário"
                            placeholderTextColor={colors.inputPlaceholder}
                            multiline
                            style={[
                                styles.commentInput,
                                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText },
                            ]}
                        />
                        <TouchableOpacity
                            style={[styles.commentButton, { backgroundColor: body.trim() ? colors.primary : colors.buttonDisabled }]}
                            onPress={handleSend}
                            disabled={!body.trim() || isSaving}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="send" size={17} color={body.trim() ? colors.buttonPrimaryText : colors.buttonDisabledText} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const ActionBar = ({
    task, members, colors,
    onBack, onEdit, onDelete,
}: {
    task: Task; members: TaskMember[]; colors: any;
    onBack: () => void; onEdit: () => void; onDelete: () => void;
}) => (
    <View style={[styles.actionBar, { borderBottomColor: colors.divider }]}>
        <View style={styles.actionLeft}>
            <TouchableOpacity
                onPress={onBack}
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                accessibilityLabel="Voltar"
            >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <TaskMembersManager task={task} members={members} colors={colors} />
        </View>

        <View style={styles.actionButtons}>
            <TouchableOpacity
                onPress={onEdit}
                style={[styles.iconButton]}
                accessibilityLabel="Editar tarefa"
            >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={onDelete}
                style={[styles.iconButton]}
                accessibilityLabel="Excluir tarefa"
            >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
        </View>
    </View>
);

// ─── List Header ─────────────────────────────────────────────────────────────

const ListHeader = ({
    task, media, categories, colors, members,
    completedCount, subtasksLength,
    commentsCount, setIsEditModalVisible, setIsCreateSubtaskModalVisible,
    handleDeleteTask, userId, handsFreeEnabled, handsFreeAvailable, onHandsFreeChange,
    handsFreeActivating,
    onBack, onOpenComments,
}: {
    task: Task; media: LocalMedia[]; categories: Category[]; colors: any; members: TaskMember[];
    completedCount: number; subtasksLength: number; commentsCount: number;
    setIsEditModalVisible: (v: boolean) => void;
    setIsCreateSubtaskModalVisible: (v: boolean) => void;
    handleDeleteTask: () => void;
    userId: string;
    handsFreeEnabled: boolean;
    handsFreeAvailable: boolean | null;
    onHandsFreeChange: (enabled: boolean) => void;
    handsFreeActivating: boolean;
    onBack: () => void;
    onOpenComments: () => void;
}) => {
    const progress = subtasksLength > 0 ? Math.round((completedCount / subtasksLength) * 100) : 0;

    return (
        <View>
            {/* Barra de ações */}
            <ActionBar
                task={task}
                members={members}
                colors={colors}
                onBack={onBack}
                onEdit={() => setIsEditModalVisible(true)}
                onDelete={handleDeleteTask}
            />

            {/* Cabeçalho da tarefa */}
            <View style={styles.header}>
                {/* Categorias */}
                {categories.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryRow}
                        style={styles.categoryScroll}
                    >
                        {categories.map(cat => (
                            <View
                                key={cat.id}
                                style={[styles.categoryBadge, { backgroundColor: cat.color ?? colors.primary }]}
                            >
                                <Text style={styles.categoryText}>{cat.name}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Prioridade */}
                <TaskPriorityBadge priority={task.priority as TaskPriority} colors={colors} />

                {/* Status */}
                <TaskStatusSelector
                    status={task.status as TaskStatus}
                    colors={colors}
                    onStatusChange={(newStatus) => {
                        task.database.write(async () => {
                            await task.update(t => {
                                applyTaskStatus(t, newStatus);
                                touchForSync(t);
                            });
                        }).then(() => enqueueSyncAction('task.update', { task: taskPayload(task) }));
                    }}
                />

                {/* Título */}
                <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>

                {/* Descrição */}
                {task.description ? (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        {task.description}
                    </Text>
                ) : (<></>)}
            </View>

            {/* Divisor */}
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.mediaSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Anexos</Text>
                <MediaPreview files={media} onChange={() => { }} crud={false} />
            </View>

            <TouchableOpacity
                style={[styles.commentsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onOpenComments}
                activeOpacity={0.75}
            >
                <View style={[styles.commentsIconWrap, { backgroundColor: colors.primarySurface }]}>
                    <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.commentsButtonText, { color: colors.text }]}>
                    Comentários
                </Text>
                <Text style={[styles.commentsCount, { color: colors.textMuted }]}>
                    {commentsCount}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Cabeçalho do checklist */}
            <View style={styles.checklistHeader}>
                <View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Checklist</Text>
                    <Text style={[styles.checklistMeta, { color: colors.textSecondary }]}>
                        {completedCount} de {subtasksLength} {subtasksLength === 1 ? 'item' : 'itens'} concluído{completedCount !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => setIsCreateSubtaskModalVisible(true)}
                    style={[styles.addButton, { backgroundColor: colors.primarySurface }]}
                    accessibilityLabel="Adicionar subtarefa"
                >
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Adicionar</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.handsFreeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => onHandsFreeChange(!handsFreeEnabled)}
                activeOpacity={0.75}
                accessibilityRole="switch"
                accessibilityState={{ checked: handsFreeEnabled, disabled: handsFreeAvailable !== true }}
            >
                <View style={[styles.handsFreeIcon, { backgroundColor: handsFreeEnabled ? colors.successSurface : colors.primarySurface }]}>
                    <Ionicons
                        name="hand-left-outline"
                        size={19}
                        color={handsFreeEnabled ? colors.success : colors.primary}
                    />
                </View>
                <View style={styles.handsFreeText}>
                    <Text style={[styles.handsFreeLabel, { color: colors.text }]}>Mãos livres</Text>
                    <Text style={[styles.handsFreeStatus, { color: handsFreeEnabled ? colors.success : colors.textMuted }]}>
                        {handsFreeActivating
                            ? 'Ativando sensor'
                            : handsFreeAvailable === null
                            ? 'Toque para verificar'
                            : handsFreeAvailable
                                ? handsFreeEnabled ? 'Ativo' : 'Inativo'
                                : 'Indisponível'}
                    </Text>
                </View>
                <Switch
                    value={handsFreeEnabled}
                    pointerEvents="none"
                    trackColor={{ false: colors.border, true: colors.success }}
                    thumbColor={colors.surfaceElevated}
                />
            </TouchableOpacity>

            {/* Barra de progresso */}
            {subtasksLength > 0 && (
                <View style={styles.progressContainer}>
                    <ProgressBar completed={completedCount} total={subtasksLength} colors={colors} />
                    <Text style={[styles.progressLabel, { color: colors.textMuted }]}>{progress}%</Text>
                </View>
            )}
        </View>
    );
};

// ─── TaskDetails ──────────────────────────────────────────────────────────────

function TaskDetails({
    task,
    media,
    subtasks,
    members,
    categories,
    comments,
    completedCount,
}: {
    task: Task;
    media: Media[];
    subtasks: Subtask[];
    members: TaskMember[];
    categories: Category[];
    comments: Comment[];
    completedCount: number;
}) {
    const router = useRouter();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isCreateSubtaskModalVisible, setIsCreateSubtaskModalVisible] = useState(false);
    const [isCommentsVisible, setIsCommentsVisible] = useState(false);
    const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasks);
    const [handsFreeEnabled, setHandsFreeEnabled] = useState(false);
    const [handsFreeActivating, setHandsFreeActivating] = useState(false);
    const [sensorFeedback, setSensorFeedback] = useState<string | null>(null);
    const completionInProgress = useRef(false);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { cancelTaskNotifications } = useTaskNotification();
    const localMedia: LocalMedia[] = media.map(m => ({
        serverId: m.serverId,
        name: m.name,
        url: m.url,
        localUrl: 'file://' + getDirPath(m.type as MediaType) + m.url,
        mimeType: m.mime_type,
        type: m.type as MediaType,
        size: m.size,
    }));

    useEffect(() => {
        if (subtasks.length !== localSubtasks.length) {
            setLocalSubtasks(subtasks);
        }
    }, [localSubtasks.length, subtasks]);

    useEffect(() => () => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    }, []);

    const showSensorFeedback = useCallback((message: string) => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        setSensorFeedback(message);
        feedbackTimer.current = setTimeout(() => setSensorFeedback(null), 2200);
    }, []);

    const completeNextStep = useCallback(async () => {
        if (completionInProgress.current) return;

        const pendingSubtasks = subtasks.filter((subtask) => !subtask.status);
        const nextSubtask = pendingSubtasks[0];
        const shouldCompleteTask = !nextSubtask || pendingSubtasks.length === 1;
        const shouldUpdateTask = shouldCompleteTask && task.status !== 'done';

        if (!nextSubtask && !shouldUpdateTask) {
            setHandsFreeEnabled(false);
            showSensorFeedback('Tarefa já concluída');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        completionInProgress.current = true;

        try {
            await task.database.write(async () => {
                if (nextSubtask) {
                    await nextSubtask.update((record: Subtask) => {
                        record.status = true;
                        touchForSync(record);
                    });
                }

                if (shouldUpdateTask) {
                    await task.update((record) => {
                        applyTaskStatus(record, 'done');
                        touchForSync(record);
                    });
                }
            });

            if (nextSubtask) {
                await enqueueSyncAction('subtask.update', {
                    subtask: subtaskPayload(nextSubtask, task),
                });
            }

            if (shouldUpdateTask) {
                await enqueueSyncAction('task.update', {
                    task: taskPayload(task),
                });
            }

            const message = nextSubtask
                ? shouldCompleteTask
                    ? `${nextSubtask.name} e tarefa concluídas`
                    : `${nextSubtask.name} concluída`
                : 'Tarefa concluída';

            showSensorFeedback(message);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (shouldCompleteTask) {
                setHandsFreeEnabled(false);
            }
        } catch (error) {
            console.error('Erro ao concluir pelo sensor de proximidade:', error);
            showSensorFeedback('Não foi possível concluir');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            completionInProgress.current = false;
        }
    }, [showSensorFeedback, subtasks, task]);

    const {
        isAvailable: handsFreeAvailable,
        isModuleLinked: proximityModuleLinked,
        refreshAvailability: refreshProximityAvailability,
    } = useProximityGesture({
        enabled: handsFreeEnabled
            && !isEditModalVisible
            && !isCreateSubtaskModalVisible
            && !isCommentsVisible,
        onGesture: completeNextStep,
    });

    const handleHandsFreeChange = useCallback(async (enabled: boolean) => {
        if (!enabled) {
            setHandsFreeEnabled(false);
            return;
        }

        setHandsFreeEnabled(true);
        setHandsFreeActivating(true);

        const available = handsFreeAvailable === true
            ? true
            : await refreshProximityAvailability();

        setHandsFreeActivating(false);

        if (!available) {
            setHandsFreeEnabled(false);
            Alert.alert(
                'Sensor indisponível',
                proximityModuleLinked
                    ? 'O sensor de proximidade não respondeu neste aparelho.'
                    : 'O aplicativo instalado não contém o módulo do sensor. Recompile e instale novamente.',
            );
            return;
        }

        setHandsFreeEnabled(true);
        showSensorFeedback('Mãos livres ativado');
        await Haptics.selectionAsync();
    }, [handsFreeAvailable, proximityModuleLinked, refreshProximityAvailability, showSensorFeedback]);

    const handleDeleteTask = () => {
        if (!user) throw new Error('Usuário não autenticado');

        const isOwner = task.createdBy === user.id;

        const doDelete = async () => {
            try {
                await cancelTaskNotifications(task.id);
                const deletedAt = nowForSync();
                await task.database.write(async () => {
                    await addSyncTombstone({
                        table: 'tasks',
                        id: task.id,
                        serverId: task.serverId,
                        createdBy: task.createdBy,
                        deletedAt,
                    });
                    await task.update((record) => markDeletedForSync(record, deletedAt));
                    await task.markAsDeleted();
                });
                await enqueueSyncAction(isOwner ? 'task.delete' : 'task.leave', {
                    taskId: toServerId(task),
                    updatedAt: new Date(deletedAt).toISOString(),
                });
                router.back();
            } catch (error) {
                console.error('Erro ao executar ação na tarefa:', error);
            }
        };

        if (isOwner) {
            const hasMultipleMembers = members.length > 1;
            Alert.alert(
                'Excluir Tarefa',
                hasMultipleMembers
                    ? 'Isso removerá a tarefa para todos os membros. Deseja continuar?'
                    : 'Tem certeza? Esta ação não pode ser desfeita.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: doDelete },
                ]
            );
        } else {
            Alert.alert(
                'Sair da Tarefa',
                'Você deixará de ver esta tarefa na sua lista.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair', style: 'destructive', onPress: doDelete },
                ]
            );
        }
    };

    const renderSubtask = ({ item, drag, isActive }: { item: Subtask; drag: any; isActive: boolean }) => (
        <ScaleDecorator>
            <SubtaskItem subtask={item} task={task} drag={drag} isActive={isActive} />
        </ScaleDecorator>
    );

    const handleDragEnd = async ({ data }: { data: Subtask[] }) => {
        setLocalSubtasks(data);

        const saveOrder = async () => {
            try {
                await task.database.write(async () => {
                    await Promise.all(
                        data.map((s, i) =>
                            s.update((sub: Subtask) => {
                                if (sub.order !== i) {
                                    sub.order = i;
                                    touchForSync(sub);
                                }
                            })
                        )
                    );
                });
                for (const subtask of data) {
                    await enqueueSyncAction('subtask.update', {
                        subtask: subtaskPayload(subtask, task),
                    });
                }
            } catch (error) {
                console.error('Erro ao salvar ordem:', error);
            }
        };

        const scheduleTask = (window as any).requestIdleCallback ?? setTimeout;
        scheduleTask(saveOrder);
    };

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <DraggableFlatList
                data={localSubtasks}
                onDragEnd={handleDragEnd}
                keyExtractor={(item) => item.id}
                renderItem={renderSubtask}
                ListHeaderComponent={
                    <ListHeader
                        task={task}
                        media={localMedia}
                        categories={categories}
                        colors={colors}
                        members={members}
                        completedCount={completedCount}
                        subtasksLength={subtasks.length}
                        commentsCount={comments.length}
                        setIsEditModalVisible={setIsEditModalVisible}
                        setIsCreateSubtaskModalVisible={setIsCreateSubtaskModalVisible}
                        handleDeleteTask={handleDeleteTask}
                        userId={user?.id ?? ''}
                        handsFreeEnabled={handsFreeEnabled}
                        handsFreeAvailable={handsFreeAvailable}
                        onHandsFreeChange={handleHandsFreeChange}
                        handsFreeActivating={handsFreeActivating}
                        onBack={() => router.back()}
                        onOpenComments={() => setIsCommentsVisible(true)}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkbox-outline" size={40} color={colors.textMuted} />
                        <Text style={[styles.emptyStateTitle, { color: colors.textSecondary }]}>
                            Nenhum item ainda
                        </Text>
                        <Text style={[styles.emptyStateSubtitle, { color: colors.textMuted }]}>
                            Adicione itens ao checklist para acompanhar o progresso.
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.footerSpacer} />
                }
                activationDistance={20}
                contentContainerStyle={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 34 }]}
            />

            {sensorFeedback ? (
                <View
                    style={[
                        styles.sensorFeedback,
                        {
                            backgroundColor: colors.successSurface,
                            borderColor: colors.success,
                            bottom: insets.bottom + 18,
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.sensorFeedbackText, { color: colors.text }]} numberOfLines={2}>
                        {sensorFeedback}
                    </Text>
                </View>
            ) : null}

            <TaskComments
                task={task}
                comments={comments}
                colors={colors}
                userId={user?.id ?? ''}
                userName={user?.name ?? ''}
                visible={isCommentsVisible}
                onClose={() => setIsCommentsVisible(false)}
            />

            <EditTaskModal
                task={task}
                isVisible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
            />
            <CreateSubtaskModal
                taskId={task.id}
                task={task}
                subtaskCount={subtasks.length}
                isVisible={isCreateSubtaskModalVisible}
                onClose={() => setIsCreateSubtaskModalVisible(false)}
            />
        </GestureHandlerRootView>
    );
}

// ─── Enhance ───────────────────────────────────────────────────────────

const enhance = withObservables(['task'], ({ task }: { task: Task }) => ({
    task: task.observe(),
    media: task.media.observe(),
    subtasks: task.subtasks.extend(Q.sortBy('order', Q.asc)).observe(),
    members: task.members.observe(),
    categories: task.categories.observe(),
    comments: task.comments.extend(Q.sortBy('created_at', Q.asc)).observe(),
    completedCount: task.subtasks.extend(Q.where('status', true)).observeCount(),
}));

export default enhance(TaskDetails);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },

    // Action bar
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        marginBottom: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Header
    header: {
        paddingTop: 20,
        marginBottom: 24,
        gap: 12,
    },
    categoryRow: {
        flexDirection: 'row',
        gap: 6,
        paddingRight: 20,
    },
    categoryScroll: {
        flexGrow: 0,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    // Text
    title: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.3,
        lineHeight: 32,
    },
    description: {
        fontSize: 15,
        lineHeight: 23,
    },
    descriptionEmpty: {
        fontSize: 15,
        lineHeight: 23,
        fontStyle: 'italic',
    },

    // Divider
    divider: {
        height: StyleSheet.hairlineWidth,
        marginBottom: 20,
    },
    mediaSection: {
        gap: 10,
        marginBottom: 22,
    },
    commentsButton: {
        minHeight: 50,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        marginBottom: 22,
    },
    commentsIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentsButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '800',
    },
    commentsCount: {
        fontSize: 13,
        fontWeight: '800',
        minWidth: 20,
        textAlign: 'right',
    },

    // Checklist section
    checklistHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    checklistMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    handsFreeRow: {
        minHeight: 58,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    handsFreeIcon: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    handsFreeText: {
        flex: 1,
    },
    handsFreeLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    handsFreeStatus: {
        fontSize: 11,
        marginTop: 2,
    },

    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '600',
        minWidth: 32,
        textAlign: 'right',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 260,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    commentModalKeyboard: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    commentSheet: {
        maxHeight: '78%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 20,
        paddingTop: 12,
    },
    commentHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    commentModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    commentModalTitle: {
        fontSize: 19,
        fontWeight: '800',
    },
    commentsList: {
        gap: 8,
        paddingBottom: 14,
    },
    emptyComment: {
        minHeight: 58,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyCommentText: {
        fontSize: 12,
        fontWeight: '600',
    },
    commentBubble: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 6,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    commentAuthor: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
    },
    commentDate: {
        fontSize: 11,
        fontWeight: '600',
    },
    commentBody: {
        fontSize: 14,
        lineHeight: 20,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    commentInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 110,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    commentButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerSpacer: {
        height: 48,
    },
    sensorFeedback: {
        position: 'absolute',
        left: 20,
        right: 20,
        minHeight: 50,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
    },
    sensorFeedbackText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    hitSlop: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
    },
});
