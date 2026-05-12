import React, { useCallback, useEffect, useState, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
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
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SubtaskItem from '@/src/components/SubtaskItem';
import { TaskMembersManager } from '@/src/components/TaskMemberManager';

const ListHeader = memo((
    {
        task, categories, colors, members, completedCount, subtasksLength,
        setIsEditModalVisible, setIsCreateSubtaskModalVisible, handleDeleteTask,
        userId
    }: {
        task: Task; categories: Category[]; colors: any; members: TaskMember[];
        completedCount: number; subtasksLength: number;
        setIsEditModalVisible: (visible: boolean) => void;
        setIsCreateSubtaskModalVisible: (visible: boolean) => void;
        handleDeleteTask: () => void;
        userId: string;
    }) => (
    <View>
        {/* Barra Superior com Ações e Membros */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 20 }}>
                <TouchableOpacity onPress={handleDeleteTask}>
                    <Ionicons name="trash-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
                    <Ionicons name="create-outline" size={26} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <TaskMembersManager
                task={task}
                members={members}
                colors={colors}
                currentUserId={userId}
            />
        </View>

        {/* Informações da Task */}
        <View style={styles.header}>
            <View style={styles.categoryRow}>
                {categories.map(cat => (
                    <View key={cat.id} style={[styles.categoryBadge, { backgroundColor: cat.color || colors.primary }]}>
                        <Text style={styles.categoryText}>{cat.name}</Text>
                    </View>
                ))}
            </View>
            <Text style={[styles.priorityText, { color: colors.text }]}>{task.priority.toUpperCase()}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{task.description || "Sem descrição disponível."}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Checklist  {completedCount}/{subtasksLength}
            </Text>
            <TouchableOpacity onPress={() => setIsCreateSubtaskModalVisible(true)}>
                <Ionicons name="add-circle" size={30} color="#df1212" />
            </TouchableOpacity>
        </View>
    </View>
));

function TaskDetails({ task, subtasks, members, categories, completedCount }: {
    task: Task;
    subtasks: Subtask[];
    members: TaskMember[];
    categories: Category[];
    completedCount: number
}) {
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isCreateSubtaskModalVisible, setIsCreateSubtaskModalVisible] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [localSubtasks, setLocalSubtasks] = useState(subtasks);

    useEffect(() => {
        if (subtasks.length !== localSubtasks.length) {
            setLocalSubtasks(subtasks);
        }
    }, [subtasks]);

    const handleDeleteTask = () => {
        if (!user) throw new Error("Usuário não autenticado");
        if (task.createdBy == user?.id && members.length === 1) {
            Alert.alert("Excluir Tarefa", "Tem certeza? Não será possível recuperar a tarefa.", [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir", style: "destructive",
                    onPress: async () => {
                        try {
                            await task.database.write(async () => { await task.markAsDeleted(); });
                            router.back();
                        } catch (error) { console.error("Erro ao deletar:", error); }
                    }
                }
            ]);
        } else if (task.createdBy == user?.id && members.length > 1) {
            Alert.alert("Excluir Tarefa", "Isso apagará a tarefa para todos os usuários.", [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir", style: "destructive",
                    onPress: async () => {
                        try {
                            await task.database.write(async () => { await task.markAsDeleted(); });
                            router.back();
                        } catch (error) { console.error("Erro ao deletar:", error); }
                    }
                }
            ]);
        } else {
            Alert.alert("Sair da Tarefa", "Você não verá mais esta tarefa na sua lista.", [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sair", style: "destructive",
                    onPress: async () => {
                        try {
                            await task.database.write(async () => { await task.markAsDeleted(); });
                            router.back();
                        } catch (error) { console.error("Erro ao deletar:", error); }
                    }
                }
            ]);
        }
    };

    const renderSubtask = useCallback(({ item, drag, isActive }: { item: Subtask; drag: any; isActive: boolean }) => (
        <ScaleDecorator>
            <SubtaskItem subtask={item} drag={drag} isActive={isActive} />
        </ScaleDecorator>
    ), []);

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <DraggableFlatList
                data={localSubtasks}
                onDragEnd={async ({ data }) => {
                    setLocalSubtasks(data);

                    const saveOrder = async () => {
                        try {
                            await task.database.write(async () => {
                                await Promise.all(
                                    data.map((s, i) => s.update((sub: Subtask) => {
                                        if (sub.order !== i) sub.order = i;
                                    }))
                                );
                            });
                        } catch (error) {
                            console.error("Erro ao salvar ordem:", error);
                        }
                    };
                    const scheduleTask = (window as any).requestIdleCallback || setTimeout;
                    scheduleTask(saveOrder);
                }}
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
                        userId={user?.id || ''}
                    />
                }
                ListFooterComponent={<View style={{ height: 40 }} />}
                activationDistance={20}
                contentContainerStyle={styles.container}
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

const arePropsEqual = (prev: any, next: any) => {
    if (!prev || !next) return false;

    if (prev.task !== next.task) return false;
    if (prev.completedCount !== next.completedCount) return false;
    if (prev.members.length !== next.members.length) return false;

    const prevIds = prev.subtasks?.map((s: Subtask) => s.id).join('|') || '';
    const nextIds = next.subtasks?.map((s: Subtask) => s.id).join('|') || '';

    const isOrderSame = prevIds === nextIds;

    console.warn(`[Memo] Ordem igual: ${isOrderSame}`);

    return isOrderSame;
};

const enhance = withObservables(['task'], ({ task }: { task: Task }) => ({
    task: task.observe(),
    subtasks: task.subtasks.extend(Q.sortBy('order', Q.asc)).observe(),
    members: task.members.observe(),
    categories: task.categories.observe(),
    completedCount: task.subtasks.extend(Q.where('status', true)).observeCount(),
}));

export default memo(enhance(TaskDetails), arePropsEqual);

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { marginBottom: 30, paddingTop: 20 },
    priorityText: { fontWeight: 'bold', fontSize: 12, marginBottom: 8 },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
    description: { fontSize: 16, lineHeight: 24 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: '#1a1a1a'
    },
    subtaskName: { fontSize: 16, marginLeft: 12, flex: 1 },
    completedText: { textDecorationLine: 'line-through', color: '#888' },
    emptyText: { fontStyle: 'italic' },
    categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    categoryText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    sectionHeaderClickable: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingVertical: 10
    },
    membersList: { borderRadius: 12, padding: 10, marginTop: 8 },
    memberItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a'
    },
    avatarPlaceholder: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    memberFullText: { fontSize: 16 },
});