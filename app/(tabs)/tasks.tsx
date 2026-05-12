import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import Category from '@/src/database/model/Category';
import TaskItem from '@/src/components/TaskItem';
import { TaskFilters } from '@/src/components/TaskFilters';
import TaskMember from '@/src/database/model/TaskMember';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { CreateTaskModal } from '@/src/components/CreateTaskModal';

const TasksList = withObservables(
    ['selectedCategories', 'selectedStatus', 'selectedPriorities', 'dateRange', 'createdByMe', 'selectedMembers'],
    ({ selectedCategories, selectedStatus, selectedPriorities, dateRange, createdByMe, selectedMembers, userId }: any) => {
        const conditions = [];

        if (selectedCategories.length > 0) conditions.push(Q.on('task_categories', 'category_id', Q.oneOf(selectedCategories)));
        if (selectedStatus.length > 0) conditions.push(Q.where('status', Q.oneOf(selectedStatus)));
        if (selectedPriorities.length > 0) conditions.push(Q.where('priority', Q.oneOf(selectedPriorities)));
        if (dateRange.start && dateRange.end) conditions.push(Q.where('deadline', Q.between(dateRange.start.getTime(), dateRange.end.getTime())));
        if (createdByMe === 'me') conditions.push(Q.where('created_by', userId));
        if (selectedMembers.length > 0) conditions.push(Q.on('task_members', 'user_id', Q.oneOf(selectedMembers)));

        return {
            tasks: database.get<Task>('tasks').query(...conditions).observe(),
        };
    })(({ tasks }: { tasks: Task[] }) => (
        <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TaskItem task={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={() => (
                <Text style={styles.emptyText}>Nenhuma tarefa encontrada.</Text>
            )}
        />
    ));

function TasksContent({ categories, members }: { categories: Category[], members: TaskMember[] }) {
    const { user } = useAuth();
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
    const [createdByMe, setCreatedByMe] = useState<string>('me');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Minhas Tarefas</Text>

            <View style={{ marginBottom: 20 }}>
                <FlatList
                    horizontal
                    data={categories}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.categoryList}
                    renderItem={({ item }) => {
                        const isSelected = selectedCategories.includes(item.id);
                        return (
                            <TouchableOpacity
                                style={[styles.categoryChip, isSelected && styles.activeChip]}
                                onPress={() => {
                                    setSelectedCategories(prev =>
                                        isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                    );
                                }}
                            >
                                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                <Text style={styles.chipText}>{item.name}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            <TaskFilters
                categories={categories}
                members={members}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                selectedPriorities={selectedPriorities}
                setSelectedPriorities={setSelectedPriorities}
                selectedDateRange={dateRange}
                setSelectedDateRange={setDateRange}
                createdByMe={createdByMe}
                setCreatedByMe={setCreatedByMe}
                selectedMembers={selectedMembers}
                setSelectedMembers={setSelectedMembers}
                enabledFilters={['category', 'status', 'priority', 'dateRange', 'createdByMe', 'members']}
            />

            <TasksList
                selectedCategories={selectedCategories}
                selectedStatus={selectedStatus}
                selectedPriorities={selectedPriorities}
                dateRange={dateRange}
                createdByMe={createdByMe}
                selectedMembers={selectedMembers}
                userId={user?.id || null}
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <CreateTaskModal isVisible={modalVisible} onClose={() => setModalVisible(false)} />
        </View>
    );
}

const enhance = withObservables(['userId'], ({ userId }: { userId: string | null }) => ({
    categories: database.get<Category>('categories').query(Q.where('created_by', Q.eq(userId))).observe(),
    members: database.get<TaskMember>('task_members').query().observe()
}));

const EnhancedTasks = enhance(TasksContent);

export default function Tasks() {
    const { user } = useAuth();

    if (!user?.id) return null;
    return <EnhancedTasks userId={user.id} />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f0f', padding: 20, paddingTop: 60 },
    headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    categoryList: { gap: 10, paddingRight: 20 },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    activeChip: { borderColor: '#4f46e5', backgroundColor: '#4f46e520' },
    chipText: { color: '#fff', fontSize: 14 },
    colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    emptyText: { color: '#a1a1a1', textAlign: 'center', marginTop: 40 },
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#4f46e5',
        borderRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});