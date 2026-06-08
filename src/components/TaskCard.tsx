import { TASK_PRIORITIES, TASK_STATUS, TaskPriority, TaskStatus } from '@/src/constants/taskConstants';
import { useTheme } from '@/src/contexts/ThemeContext';
import Task from '@/src/database/model/Task';
import { getRecurrenceLabel } from '@/src/utils/taskRecurrence';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TaskCardVariant = 'list' | 'calendar' | 'compact';

type Props = {
    task: Task;
    variant?: TaskCardVariant;
    showDate?: boolean;
    showTime?: boolean;
    showStatus?: boolean;
    showDescription?: boolean;
    showPriority?: boolean;
    showRecurrence?: boolean;
    showMembers?: boolean;
    showProgress?: boolean;
    membersCount?: number;
    subtasksCount?: number;
    completedCount?: number;
};

function formatTaskDate(date?: string) {
    if (!date) return null;
    const value = new Date(`${date}T00:00:00`);
    const currentYear = new Date().getFullYear();
    const formatted = value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return value.getFullYear() === currentYear ? formatted : `${formatted} ${value.getFullYear()}`;
}

export default function TaskCard({
    task,
    variant = 'calendar',
    showDate = false,
    showTime = true,
    showStatus = false,
    showDescription = false,
    showPriority = true,
    showRecurrence = true,
    showMembers = true,
    showProgress = true,
    membersCount = 0,
    subtasksCount = 0,
    completedCount = 0,
}: Props) {
    const { colors } = useTheme();
    const router = useRouter();

    const priorityConfig = TASK_PRIORITIES[task.priority as TaskPriority] ?? TASK_PRIORITIES.none;
    const statusConfig = TASK_STATUS[task.status as TaskStatus] ?? TASK_STATUS.pending;
    const priorityColor = colors[priorityConfig.colorKey];
    const priorityBg = colors[priorityConfig.surfaceKey];
    const statusColor = colors[statusConfig.colorKey];
    const statusBg = colors[statusConfig.surfaceKey];
    const recurrenceLabel = getRecurrenceLabel(task.recurrenceType, task.recurrenceWeekdays);
    const dateLabel = formatTaskDate(task.deadlineDate);
    const hasProgress = showProgress && subtasksCount > 0;
    const progress = hasProgress ? completedCount / subtasksCount : 0;
    const isCompact = variant === 'compact';

    return (
        <TouchableOpacity
            style={[
                styles.card,
                isCompact ? styles.compactCard : styles.regularCard,
                {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                    borderLeftColor: priorityColor,
                },
            ]}
            onPress={() => router.push(`/task/${task.id}`)}
            activeOpacity={0.72}
        >
            <View style={styles.header}>
                <Text
                    style={[isCompact ? styles.compactTitle : styles.title, { color: colors.text }]}
                    numberOfLines={isCompact ? 2 : 2}
                >
                    {task.title}
                </Text>
                {showStatus && !isCompact && (
                    <View style={[styles.badge, { backgroundColor: statusBg }]}>
                        <View style={[styles.dot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                )}
            </View>

            {showDescription && !!task.description && !isCompact && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {task.description}
                </Text>
            )}

            <View style={styles.metaRow}>
                {showTime && task.deadlineTime && (
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={isCompact ? 11 : 13} color={colors.textMuted} />
                        <Text style={[styles.metaText, isCompact && styles.compactMetaText, { color: colors.textMuted }]}>
                            {task.deadlineTime}
                        </Text>
                    </View>
                )}
                {showDate && dateLabel && (
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={isCompact ? 11 : 13} color={colors.textMuted} />
                        <Text style={[styles.metaText, isCompact && styles.compactMetaText, { color: colors.textMuted }]}>
                            {dateLabel}
                        </Text>
                    </View>
                )}
                {showMembers && membersCount > 1 && (
                    <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={isCompact ? 11 : 13} color={colors.textMuted} />
                        <Text style={[styles.metaText, isCompact && styles.compactMetaText, { color: colors.textMuted }]}>
                            {membersCount}
                        </Text>
                    </View>
                )}
                {showRecurrence && recurrenceLabel && (
                    <View style={styles.metaItem}>
                        <Ionicons name="repeat-outline" size={isCompact ? 11 : 13} color={colors.textMuted} />
                        <Text style={[styles.metaText, isCompact && styles.compactMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                            {recurrenceLabel}
                        </Text>
                    </View>
                )}
            </View>

            {hasProgress && (
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

            {showPriority && !isCompact && (
                <View style={[styles.priorityBadge, { backgroundColor: priorityBg }]}>
                    <View style={[styles.dot, { backgroundColor: priorityColor }]} />
                    <Text style={[styles.badgeText, { color: priorityColor }]}>
                        {priorityConfig.label}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderLeftWidth: 3,
        overflow: 'hidden',
    },
    regularCard: {
        padding: 14,
        gap: 9,
    },
    compactCard: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 8,
        paddingVertical: 7,
        gap: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 20,
    },
    compactTitle: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 15,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
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
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        maxWidth: '100%',
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
    },
    compactMetaText: {
        fontSize: 10,
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
        fontWeight: '600',
        minWidth: 28,
        textAlign: 'right',
    },
});
