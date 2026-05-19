import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import Task from '@/src/database/model/Task';
import { TASK_PRIORITIES, TASK_STATUS, TaskPriority, TaskStatus } from '@/src/constants/taskConstants';
import { useTheme } from '@/src/contexts/ThemeContext';

type Card = 'calendar-month' | 'home' | 'tasks';

interface Props {
    task: Task;
    membersCount: number;
    subtasksCount: number;
    completedCount: number;
    type?: Card;
}

const TaskCard = ({ task, membersCount, subtasksCount, completedCount, type }: Props) => {
    const router = useRouter();
    const { colors } = useTheme();

    const priorityConfig = TASK_PRIORITIES[task.priority as TaskPriority] ?? TASK_PRIORITIES.none;
    const statusConfig = TASK_STATUS[task.status as TaskStatus] ?? TASK_STATUS.pending;

    const priorityColor = colors[priorityConfig.colorKey];
    const priorityBg = colors[priorityConfig.surfaceKey];
    const statusColor = colors[statusConfig.colorKey];
    const statusBg = colors[statusConfig.surfaceKey];

    const hasSubtasks = subtasksCount > 0;
    const progress = hasSubtasks ? completedCount / subtasksCount : 0;

    return (
        <TouchableOpacity
            style={[styles.card, {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                borderLeftColor: priorityColor,
            }]}
            onPress={() => router.push(`/task/${task.id}`)}
            activeOpacity={0.7}
        >
            {/* Cabeçalho */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {task.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: statusBg }]}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.badgeText, { color: statusColor }]}>
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            {/* Descrição */}
            {!!task.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {task.description}
                </Text>
            )}

            {/* Barra de progresso */}
            {hasSubtasks && (
                <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                        <View style={[
                            styles.progressFill,
                            {
                                width: `${Math.round(progress * 100)}%` as any,
                                backgroundColor: progress === 1 ? colors.success : colors.primary,
                            },
                        ]} />
                    </View>
                    <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                        {completedCount}/{subtasksCount}
                    </Text>
                </View>
            )}

            {/* Rodapé */}
            <View style={styles.footer}>
                <View style={[styles.priorityBadge, { backgroundColor: priorityBg }]}>
                    <View style={[styles.dot, { backgroundColor: priorityColor }]} />
                    <Text style={[styles.badgeText, { color: priorityColor }]}>
                        {priorityConfig.label}
                    </Text>
                </View>

                <View style={styles.metaRow}>
                    {membersCount > 1 && (
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>{membersCount}</Text>
                        </View>
                    )}
                    {task.deadline && (
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                            {type === 'calendar-month' && (
                                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                                    {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}{new Date(task.deadline).getFullYear() !== new Date().getFullYear() ? `, ${new Date(task.deadline).getFullYear()}` : ''}
                                    {new Date(task.deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            )}
                            {(type === 'home' || type === 'tasks') && (
                                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                                    {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}{new Date(task.deadline).getFullYear() !== new Date().getFullYear() ? `, ${new Date(task.deadline).getFullYear()}` : ''}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const TaskItem = withObservables(['task'], ({ task }: { task: Task }) => ({
    task: task.observe(),
    membersCount: task.members.observeCount(),
    subtasksCount: task.subtasks.observeCount(),
    completedCount: task.subtasks.extend(Q.where('status', Q.eq(true))).observeCount(),
}))(TaskCard);

export default TaskItem;

const styles = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderLeftWidth: 3,
        gap: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        lineHeight: 21,
    },
    description: {
        fontSize: 13,
        lineHeight: 19,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        flexShrink: 0,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '500',
        minWidth: 28,
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
    },
});