import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '@/src/contexts/AuthContext';
import TaskItem from '@/src/components/TaskItem';
import { CreateTaskModal } from '@/src/components/CreateTaskModal';
import { useTheme } from '@/src/contexts/ThemeContext';

// ─── Saudação dinâmica ────────────────────────────────────────────────────────

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function Home({ tasks }: { tasks: Task[] }) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        console.log('Iniciando sincronização...');
        setRefreshing(false);
    };

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

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
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.greeting, { color: colors.text }]}>
                        {getGreeting()}{user?.name ? `, ${user.name}` : ''}! 👋
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {total === 0
                            ? 'Nenhuma tarefa para hoje'
                            : `${total} ${total === 1 ? 'tarefa' : 'tarefas'} para hoje`}
                    </Text>
                </View>

                {/* Card de progresso */}
                <View style={[styles.progressCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={[styles.progressTitle, { color: colors.text }]}>Progresso do dia</Text>
                            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
                                {total === 0 ? 'Sem tarefas para hoje' : `${completed} de ${total} concluída${completed !== 1 ? 's' : ''}`}
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

                    {/* Mini stats */}
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

                {/* Lista de tarefas */}
                <View style={styles.tasksSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tarefas de hoje</Text>

                    <FlatList
                        data={tasks}
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

const enhance = withObservables([], () => {
    const now = new Date();
    const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0,
    );

    const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999,
    );

    return {
        tasks: database.get<Task>('tasks').query(
            Q.where('deadline', Q.between(startOfDay.getTime(), endOfDay.getTime()))
        ).observe(),
    };
});

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