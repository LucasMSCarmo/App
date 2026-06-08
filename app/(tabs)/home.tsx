import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { useAuth } from '@/src/contexts/AuthContext';
import TaskItem from '@/src/components/TaskItem';
import { CreateTaskModal } from '@/src/components/CreateTaskModal';
import { useTheme } from '@/src/contexts/ThemeContext';
import { TODAY } from '@/src/utils/dateHelpers';
import { getTasksForDate } from '@/src/utils/taskRecurrence';
import { useLocalSearchParams, useRouter } from 'expo-router';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

function Home({ tasks }: {
    tasks: Task[];
}) {
    const todayTasks = getTasksForDate(tasks, TODAY);
    const completed = todayTasks.filter((task) => task.status === 'done').length;
    const pending = todayTasks.filter((task) => task.status === 'pending').length;
    const cancelled = todayTasks.filter((task) => task.status === 'cancelled').length;
    const total = todayTasks.length;
    const countable = total - cancelled;
    const progress = countable > 0 ? Math.round((completed / countable) * 100) : 0;
    const { user } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const { quickCreate } = useLocalSearchParams<{ quickCreate?: string }>();
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (!quickCreate) return;
        setModalVisible(true);
        router.setParams({ quickCreate: undefined });
    }, [quickCreate, router]);

    const onRefresh = async () => {
        setRefreshing(true);
        console.log('Iniciando sincronização...');
        setRefreshing(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >

                <View style={styles.header}>
                    <Text style={[styles.greeting, { color: colors.text }]}>
                        {getGreeting()}{user?.name ? `, ${user.name}` : ''}! 👋
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {countable === 0
                            ? 'Nenhuma tarefa para hoje'
                            : `${countable} ${countable === 1 ? 'tarefa' : 'tarefas'} para hoje`}
                    </Text>
                </View>

                <View style={[styles.progressCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={[styles.progressTitle, { color: colors.text }]}>Progresso do dia</Text>
                            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
                                {countable === 0 ? 'Sem tarefas para hoje' : `${completed} de ${countable} concluída${completed !== 1 ? 's' : ''}`}
                            </Text>
                        </View>
                        <Text style={[styles.progressPercentage, { color: progress === 100 ? colors.success : colors.primary }]}>
                            {progress}%
                        </Text>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                        <View style={[
                            styles.progressFill,
                            {
                                width: `${progress}%` as any,
                                backgroundColor: progress === 100 ? colors.success : colors.primary,
                            },
                        ]} />
                    </View>

                    {total > 0 && (
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <View style={[styles.statDot, { backgroundColor: colors.statusPending }]} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                    {pending} pendente{pending !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <View style={[styles.statDot, { backgroundColor: colors.statusDone }]} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                    {completed} concluída{completed !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.tasksSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tarefas de hoje</Text>

                    <FlatList
                        data={todayTasks}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <TaskItem task={item} type={'home'} />}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <Ionicons name="sunny-outline" size={36} color={colors.textMuted} />
                                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                                    Dia livre!
                                </Text>
                                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                                    Nenhuma tarefa com prazo para hoje.
                                </Text>
                            </View>
                        )}
                    />
                </View>
            </ScrollView>

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

const enhance = withObservables([], () => ({
    tasks: database.get<Task>('tasks')
        .query()
        .observe(),
}));

export default enhance(Home);

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        marginTop: 4,
    },
    progressCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 20,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 14,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressSubtitle: {
        fontSize: 13,
        marginTop: 3,
    },
    progressPercentage: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -1,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statText: {
        fontSize: 12,
        fontWeight: '500',
    },
    tasksSection: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        letterSpacing: -0.2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
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
        maxWidth: 240,
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
