import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import Task from '@/src/database/model/Task';
import Subtask from '@/src/database/model/Subtask';
import TaskMember from '@/src/database/model/TaskMember';
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
import { TaskStatus } from '@/src/constants/taskConstants';
import TaskPriorityBadge from '@/src/components/TaskPriorityBadge';
import { TaskPriority } from '@/src/constants/taskConstants';

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
    }, [progress]);

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

// ─── Action Bar ──────────────────────────────────────────────────────────────

const ActionBar = ({
    task, members, colors, userId,
    onEdit, onDelete,
}: {
    task: Task; members: TaskMember[]; colors: any; userId: string;
    onEdit: () => void; onDelete: () => void;
}) => (
    <View style={[styles.actionBar, { borderBottomColor: colors.divider }]}>
        <TaskMembersManager task={task} members={members} colors={colors} />

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
    task, categories, colors, members,
    completedCount, subtasksLength,
    setIsEditModalVisible, setIsCreateSubtaskModalVisible,
    handleDeleteTask, userId,
}: {
    task: Task; categories: Category[]; colors: any; members: TaskMember[];
    completedCount: number; subtasksLength: number;
    setIsEditModalVisible: (v: boolean) => void;
    setIsCreateSubtaskModalVisible: (v: boolean) => void;
    handleDeleteTask: () => void;
    userId: string;
}) => {
    const progress = subtasksLength > 0 ? Math.round((completedCount / subtasksLength) * 100) : 0;

    return (
        <View>
            {/* Barra de ações */}
            <ActionBar
                task={task}
                members={members}
                colors={colors}
                userId={userId}
                onEdit={() => setIsEditModalVisible(true)}
                onDelete={handleDeleteTask}
            />

            {/* Cabeçalho da tarefa */}
            <View style={styles.header}>
                {/* Categorias */}
                {categories.length > 0 && (
                    <View style={styles.categoryRow}>
                        {categories.map(cat => (
                            <View
                                key={cat.id}
                                style={[styles.categoryBadge, { backgroundColor: cat.color ?? colors.primary }]}
                            >
                                <Text style={styles.categoryText}>{cat.name}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Prioridade */}
                <TaskPriorityBadge priority={task.priority as TaskPriority} colors={colors} />

                {/* Status */}
                <TaskStatusSelector
                    status={task.status as TaskStatus}
                    colors={colors}
                    onStatusChange={(newStatus) => {
                        task.database.write(async () => {
                            await task.update(t => { t.status = newStatus; });
                        });
                    }}
                />

                {/* Título */}
                <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>

                {/* Descrição */}
                {task.description ? (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        {task.description}
                    </Text>
                ) : ( <></> )}
            </View>

            {/* Divisor */}
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

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
    subtasks,
    members,
    categories,
    completedCount,
}: {
    task: Task;
    subtasks: Subtask[];
    members: TaskMember[];
    categories: Category[];
    completedCount: number;
}) {
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isCreateSubtaskModalVisible, setIsCreateSubtaskModalVisible] = useState(false);
    const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasks);

    useEffect(() => {
        if (subtasks.length !== localSubtasks.length) {
            setLocalSubtasks(subtasks);
        }
    }, [subtasks]);

    const handleDeleteTask = () => {
        if (!user) throw new Error('Usuário não autenticado');

        const isOwner = task.createdBy === user.id;

        const doDelete = async () => {
            try {
                await task.database.write(async () => { await task.markAsDeleted(); });
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
            <SubtaskItem subtask={item} drag={drag} isActive={isActive} />
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
                                if (sub.order !== i) sub.order = i;
                            })
                        )
                    );
                });
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
                        categories={categories}
                        colors={colors}
                        members={members}
                        completedCount={completedCount}
                        subtasksLength={subtasks.length}
                        setIsEditModalVisible={setIsEditModalVisible}
                        setIsCreateSubtaskModalVisible={setIsCreateSubtaskModalVisible}
                        handleDeleteTask={handleDeleteTask}
                        userId={user?.id ?? ''}
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
                ListFooterComponent={<View style={{ height: 48 }} />}
                activationDistance={20}
                contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            />

            <EditTaskModal
                task={task}
                isVisible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
            />
            <CreateSubtaskModal
                taskId={task.id}
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
    subtasks: task.subtasks.extend(Q.sortBy('order', Q.asc)).observe(),
    members: task.members.observe(),
    categories: task.categories.observe(),
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
        flexWrap: 'wrap',
        gap: 6,
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
});