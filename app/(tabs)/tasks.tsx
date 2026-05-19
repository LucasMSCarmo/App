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
import { useTheme } from '@/src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { CreateTaskModal } from '@/src/components/CreateTaskModal';
import { Sidebar } from '@/src/components/Sidebar';
import { map } from 'rxjs/operators';

// ─── Lista reativa ────────────────────────────────────────────────────────────

const TasksList = withObservables(
    ['selectedCategories', 'selectedStatus', 'selectedPriorities', 'dateRange', 'createdByMe', 'selectedMembers'],
    ({ selectedCategories, selectedStatus, selectedPriorities, dateRange, createdByMe, selectedMembers, userId }: any) => {
        const conditions = [];
        const validSelectedPriorities = selectedPriorities ? selectedPriorities.map((p: string) => p === 'none' ? '' : p) : [];

        if (selectedCategories.length > 0) conditions.push(Q.on('task_categories', 'category_id', Q.oneOf(selectedCategories)));
        if (selectedStatus.length > 0) conditions.push(Q.where('status', Q.oneOf(selectedStatus)));
        if (selectedPriorities.length > 0) conditions.push(Q.where('priority', Q.oneOf(validSelectedPriorities)));
        if (dateRange.start && !dateRange.end) conditions.push(Q.where('deadline', Q.gte(dateRange.start.getTime())));
        if (dateRange.start && dateRange.end) conditions.push(Q.where('deadline', Q.between(dateRange.start.getTime(), dateRange.end.getTime())));
        if (createdByMe === 'me') conditions.push(Q.where('created_by', userId));
        if (selectedMembers.length > 0) conditions.push(Q.on('task_members', 'user_id', Q.oneOf(selectedMembers)));

        return {
            tasks: database.get<Task>('tasks').query(...conditions).observe(),
        };
    }
)(({ tasks, colors }: { tasks: Task[]; colors: any }) => (
    <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskItem task={item} type={'tasks'}/>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={() => (
            <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Nenhuma tarefa encontrada</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Crie uma nova tarefa ou ajuste os filtros.</Text>
            </View>
        )}
    />
));

// ─── Conteúdo principal ───────────────────────────────────────────────────────

function TasksContent({ categories, members }: { categories: Category[]; members: TaskMember[] }) {
    const { user } = useAuth();
    const { colors } = useTheme();

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
    const [createdByMe, setCreatedByMe] = useState<string>('me');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);

    const activeFiltersCount = [
        selectedCategories.length > 0,
        selectedStatus.length > 0,
        selectedPriorities.length > 0,
        dateRange.start || dateRange.end,
        createdByMe === 'me',
        selectedMembers.length > 0,
    ].filter(Boolean).length;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Minhas Tarefas</Text>
                <TouchableOpacity
                    onPress={() => setSidebarVisible(true)}
                    style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? colors.primary : colors.textSecondary} />
                    {activeFiltersCount > 0 && (
                        <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Chips de categoria */}
            {categories.length > 0 && (
                <View style={styles.categoryWrapper}>
                    <FlatList
                        horizontal
                        data={categories}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.categoryList}
                        renderItem={({ item }) => {
                            const isSelected = selectedCategories.includes(item.id);
                            const catColor = item.color ?? colors.primary;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryChip,
                                        {
                                            backgroundColor: isSelected ? catColor + '25' : colors.surface,
                                            borderColor: isSelected ? catColor : colors.border,
                                        },
                                    ]}
                                    onPress={() => setSelectedCategories(prev =>
                                        isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                    )}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.colorDot, { backgroundColor: catColor }]} />
                                    <Text style={[styles.chipText, { color: isSelected ? catColor : colors.textSecondary }]}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            )}

            {/* Lista de tarefas */}
            <TasksList
                selectedCategories={selectedCategories}
                selectedStatus={selectedStatus}
                selectedPriorities={selectedPriorities}
                dateRange={dateRange}
                createdByMe={createdByMe}
                selectedMembers={selectedMembers}
                userId={user?.id ?? null}
                colors={colors}
            />

            {/* Sidebar de filtros */}
            <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} side="right">
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
            </Sidebar>

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.buttonPrimary }]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={30} color={colors.buttonPrimaryText} />
            </TouchableOpacity>

            <CreateTaskModal isVisible={modalVisible} onClose={() => setModalVisible(false)} />
        </View>
    );
}

// ─── Enhance ──────────────────────────────────────────────────────────────────

const enhance = withObservables(['userId'], ({ userId }: { userId: string | null }) => ({
    categories: database.get<Category>('categories').query(Q.where('created_by', Q.eq(userId))).observe(),
    members: database.get<TaskMember>('task_members')
        .query()
        .observe()
        .pipe(
            map(members => {
                const unique = new Map<string, TaskMember>();
                members.forEach(m => { if (m.userId !== userId) unique.set(m.userId, m); });
                return Array.from(unique.values());
            })
        ),
}));

const EnhancedTasks = enhance(TasksContent);

export default function Tasks() {
    const { user } = useAuth();
    if (!user?.id) return null;
    return <EnhancedTasks userId={user.id} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    categoryWrapper: {
        marginBottom: 16,
    },
    categoryList: {
        paddingHorizontal: 20,
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    colorDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 260,
    },
    fab: {
        position: 'absolute',
        width: 58,
        height: 58,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 24,
        borderRadius: 29,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
});