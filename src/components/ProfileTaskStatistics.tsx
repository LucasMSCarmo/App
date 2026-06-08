import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import {
    addDays,
    addWeeks,
    format,
    startOfDay,
    startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import Subtask from '@/src/database/model/Subtask';
import { useTheme } from '@/src/contexts/ThemeContext';
import { TODAY } from '@/src/utils/dateHelpers';

type Props = {
    tasks: Task[];
    subtasks: Subtask[];
};

type Period = 'day' | 'week';

type ChartPoint = {
    key: string;
    label: string;
    longLabel: string;
    value: number;
};

type ProductivityBarChartProps = {
    data: number[];
    color: string;
    gridColor: string;
    labelColor: string;
};

function toTimestamp(value: Date | number | string | null | undefined) {
    if (!value) return null;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function getCompletionTimestamp(task: Task) {
    if (task.status !== 'done') return null;
    return toTimestamp(task.completedAt) ?? toTimestamp(task.updatedAt);
}

function formatAverageDuration(milliseconds: number | null) {
    if (milliseconds === null) return 'Sem dados';

    const hours = Math.max(0, Math.round(milliseconds / 3_600_000));
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function createDailyPoints(completedTasks: Task[]): ChartPoint[] {
    const firstDay = addDays(startOfDay(new Date()), -6);

    return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(firstDay, index);
        const key = format(date, 'yyyy-MM-dd');

        return {
            key,
            label: format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase(),
            longLabel: format(date, "dd 'de' MMM", { locale: ptBR }),
            value: completedTasks.filter((task) => {
                const completedAt = getCompletionTimestamp(task);
                return completedAt ? format(new Date(completedAt), 'yyyy-MM-dd') === key : false;
            }).length,
        };
    });
}

function createWeeklyPoints(completedTasks: Task[]): ChartPoint[] {
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const firstWeek = addWeeks(currentWeek, -5);

    return Array.from({ length: 6 }, (_, index) => {
        const weekStart = addWeeks(firstWeek, index);
        const weekEnd = addDays(weekStart, 6);
        const key = format(weekStart, 'yyyy-MM-dd');

        return {
            key,
            label: format(weekStart, 'dd/MM'),
            longLabel: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
            value: completedTasks.filter((task) => {
                const completedAt = getCompletionTimestamp(task);
                if (!completedAt) return false;
                const taskWeek = startOfWeek(new Date(completedAt), { weekStartsOn: 1 });
                return format(taskWeek, 'yyyy-MM-dd') === key;
            }).length,
        };
    });
}

function ProductivityBarChart({ data, color, gridColor, labelColor }: ProductivityBarChartProps) {
    const width = 320;
    const height = 160;
    const chartTop = 20;
    const chartBottom = 150;
    const chartHeight = chartBottom - chartTop;
    const slotWidth = width / data.length;
    const barWidth = Math.min(24, slotWidth * 0.52);
    const maxValue = Math.max(3, ...data);
    const gridLines = [0, 1, 2, 3];

    return (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            {gridLines.map((line) => {
                const y = chartTop + (chartHeight * line) / (gridLines.length - 1);
                return (
                    <Line
                        key={line}
                        x1={0}
                        x2={width}
                        y1={y}
                        y2={y}
                        stroke={gridColor}
                        strokeWidth={1}
                        strokeDasharray="4 4"
                    />
                );
            })}

            {data.map((value, index) => {
                const normalizedHeight = value > 0 ? Math.max(4, (value / maxValue) * chartHeight) : 0;
                const x = index * slotWidth + (slotWidth - barWidth) / 2;
                const y = chartBottom - normalizedHeight;

                return (
                    <React.Fragment key={index}>
                        {value > 0 ? (
                            <>
                                <Rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={normalizedHeight}
                                    rx={4}
                                    fill={color}
                                />
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={Math.max(12, y - 6)}
                                    fontSize={11}
                                    fontWeight="600"
                                    fill={labelColor}
                                    textAnchor="middle"
                                >
                                    {value}
                                </SvgText>
                            </>
                        ) : null}
                    </React.Fragment>
                );
            })}
        </Svg>
    );
}

function ProfileTaskStatistics({ tasks, subtasks }: Props) {
    const { colors } = useTheme();
    const [period, setPeriod] = useState<Period>('day');

    const statistics = useMemo(() => {
        const taskIds = new Set(tasks.map((task) => task.id));
        const relatedSubtasks = subtasks.filter((subtask) => taskIds.has(subtask.taskId));
        const completedTasks = tasks.filter((task) => task.status === 'done');
        const cancelledTasks = tasks.filter((task) => task.status === 'cancelled').length;
        const countableTasks = tasks.length - cancelledTasks;
        const completedSubtasks = relatedSubtasks.filter((subtask) => subtask.status).length;
        const durations = completedTasks
            .map((task) => {
                const completedAt = getCompletionTimestamp(task);
                const createdAt = toTimestamp(task.createdAt);
                return completedAt && createdAt ? completedAt - createdAt : null;
            })
            .filter((duration): duration is number => duration !== null && duration >= 0);

        return {
            totalTasks: tasks.length,
            completedTasks: completedTasks.length,
            pendingTasks: tasks.filter((task) => task.status === 'pending').length,
            inProgressTasks: tasks.filter((task) => task.status === 'in_progress').length,
            cancelledTasks,
            overdueTasks: tasks.filter((task) => (
                task.deadlineDate
                && task.deadlineDate < TODAY
                && task.status !== 'done'
                && task.status !== 'cancelled'
            )).length,
            totalSubtasks: relatedSubtasks.length,
            completedSubtasks,
            taskProgress: countableTasks > 0
                ? Math.round((completedTasks.length / countableTasks) * 100)
                : 0,
            subtaskProgress: relatedSubtasks.length > 0
                ? Math.round((completedSubtasks / relatedSubtasks.length) * 100)
                : 0,
            averageCompletionTime: durations.length > 0
                ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
                : null,
            usesEstimatedHistory: completedTasks.some((task) => !task.completedAt),
            dailyPoints: createDailyPoints(completedTasks),
            weeklyPoints: createWeeklyPoints(completedTasks),
        };
    }, [subtasks, tasks]);

    if (statistics.totalTasks === 0) {
        return (
            <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primarySurface }]}>
                    <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.emptyText}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem estatísticas ainda</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                        Seus resultados aparecerão depois que você criar tarefas.
                    </Text>
                </View>
            </View>
        );
    }

    const chartPoints = period === 'day' ? statistics.dailyPoints : statistics.weeklyPoints;
    const chartValues = chartPoints.map((point) => point.value);
    const recentCompleted = chartValues.reduce((total, value) => total + value, 0);
    const bestPoint = chartPoints.reduce<ChartPoint | null>(
        (best, point) => !best || point.value > best.value ? point : best,
        null,
    );
    return (
        <View>
            <View style={styles.metricGrid}>
                <View style={styles.metricItem}>
                    <View style={[styles.metricIcon, { backgroundColor: colors.successSurface }]}>
                        <Ionicons name="checkmark-circle-outline" size={19} color={colors.success} />
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{statistics.taskProgress}%</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Taxa de conclusão</Text>
                </View>
                <View style={styles.metricItem}>
                    <View style={[styles.metricIcon, { backgroundColor: colors.infoSurface }]}>
                        <Ionicons name="timer-outline" size={19} color={colors.info} />
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {formatAverageDuration(statistics.averageCompletionTime)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Tempo médio</Text>
                </View>
                <View style={styles.metricItem}>
                    <View style={[styles.metricIcon, { backgroundColor: colors.primarySurface }]}>
                        <Ionicons name="calendar-outline" size={19} color={colors.primary} />
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{recentCompleted}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        {period === 'day' ? 'Últimos 7 dias' : 'Últimas 6 semanas'}
                    </Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.chartSection}>
                <View style={styles.chartHeader}>
                    <View style={styles.chartTitleGroup}>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Tarefas concluídas</Text>
                        <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                            {bestPoint && bestPoint.value > 0
                                ? `Melhor período: ${bestPoint.longLabel}`
                                : 'Nenhuma conclusão no período'}
                        </Text>
                    </View>

                    <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
                        {([
                            { value: 'day', label: 'Dia' },
                            { value: 'week', label: 'Semana' },
                        ] as const).map((option) => {
                            const active = period === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.segment,
                                        active && { backgroundColor: colors.surfaceElevated },
                                    ]}
                                    onPress={() => setPeriod(option.value)}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: active }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[
                                        styles.segmentText,
                                        { color: active ? colors.primary : colors.textMuted },
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.chartWrap}>
                    <ProductivityBarChart
                        data={chartValues}
                        color={colors.primary}
                        gridColor={colors.divider}
                        labelColor={colors.textSecondary}
                    />
                    <View style={styles.chartLabels}>
                        {chartPoints.map((point) => (
                            <Text
                                key={point.key}
                                style={[styles.chartAxisLabel, { color: colors.textMuted }]}
                                numberOfLines={1}
                            >
                                {point.label}
                            </Text>
                        ))}
                    </View>
                </View>

                {statistics.usesEstimatedHistory ? (
                    <View style={[styles.estimateNote, { backgroundColor: colors.warningSurface }]}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                        <Text style={[styles.estimateText, { color: colors.textSecondary }]}>
                            Conclusões antigas usam a última atualização como estimativa.
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: colors.text }]}>Progresso das subtarefas</Text>
                    <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>
                        {statistics.totalSubtasks > 0
                            ? `${statistics.completedSubtasks} de ${statistics.totalSubtasks}`
                            : 'Nenhuma criada'}
                    </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                backgroundColor: colors.info,
                                width: `${statistics.subtaskProgress}%` as any,
                            },
                        ]}
                    />
                </View>
            </View>

            <View style={[styles.statusRow, { borderTopColor: colors.divider }]}>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: colors.statusPending }]} />
                    <Text style={[styles.statusValue, { color: colors.text }]}>{statistics.pendingTasks}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Pendentes</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: colors.statusInProgress }]} />
                    <Text style={[styles.statusValue, { color: colors.text }]}>{statistics.inProgressTasks}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Em curso</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: colors.statusDone }]} />
                    <Text style={[styles.statusValue, { color: colors.text }]}>{statistics.completedTasks}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Concluídas</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: colors.statusCancelled }]} />
                    <Text style={[styles.statusValue, { color: colors.text }]}>{statistics.cancelledTasks}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Canceladas</Text>
                </View>
            </View>

            {statistics.overdueTasks > 0 ? (
                <View style={[styles.overdueRow, { backgroundColor: colors.dangerSurface }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                    <Text style={[styles.overdueText, { color: colors.danger }]}>
                        {statistics.overdueTasks} {statistics.overdueTasks === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

const enhance = withObservables([], () => ({
    tasks: database.get<Task>('tasks').query().observe(),
    subtasks: database.get<Subtask>('subtasks').query().observe(),
}));

export default enhance(ProfileTaskStatistics);

const styles = StyleSheet.create({
    metricGrid: {
        minHeight: 112,
        paddingHorizontal: 12,
        paddingVertical: 16,
        flexDirection: 'row',
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    metricIcon: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 7,
    },
    metricValue: {
        fontSize: 17,
        fontWeight: '700',
    },
    metricLabel: {
        marginTop: 2,
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'center',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
    },
    chartSection: {
        padding: 16,
        gap: 14,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    chartTitleGroup: {
        flex: 1,
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    chartSubtitle: {
        marginTop: 3,
        fontSize: 11,
    },
    segmentedControl: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 3,
    },
    segment: {
        minHeight: 30,
        minWidth: 48,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentText: {
        fontSize: 11,
        fontWeight: '700',
    },
    chartWrap: {
        minHeight: 190,
    },
    chartLabels: {
        minHeight: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chartAxisLabel: {
        flex: 1,
        fontSize: 9,
        textAlign: 'center',
    },
    estimateNote: {
        minHeight: 36,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    estimateText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 15,
    },
    progressSection: {
        padding: 16,
        gap: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    progressDetail: {
        fontSize: 11,
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
    statusRow: {
        minHeight: 66,
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginBottom: 3,
    },
    statusValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    statusLabel: {
        fontSize: 10,
        marginTop: 1,
    },
    overdueRow: {
        marginHorizontal: 12,
        marginBottom: 12,
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    overdueText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    emptyIcon: {
        width: 42,
        height: 42,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        flex: 1,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
});
