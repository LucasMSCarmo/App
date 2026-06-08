import { TASK_PRIORITIES } from '@/src/constants/taskConstants';
import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { parseDateString, toDateString } from '@/src/utils/dateHelpers';
import { getTasksForDate } from '@/src/utils/taskRecurrence';
import withObservables from '@nozbe/with-observables';
import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import {
    Dimensions, FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HOUR_HEIGHT = 56;
const HOUR_COL_WIDTH = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_RANGE = 104; // ~2 anos para cada lado

interface OuterProps {
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
    onWeekChange: (weekStartStr: string) => void;
}

// ── Grade de uma semana ───────────────────────────────────────────────────────

interface WeekGridProps {
    weekStartStr: string;
    selectedDate: string;
    tasks: Task[];
    onDayPress: (dateStr: string) => void;
}

function WeekGrid({ weekStartStr, selectedDate, tasks, onDayPress }: WeekGridProps) {
    const { colors } = useTheme();
    const router = useRouter();
    const today = new Date();
    const weekStart = parseDateString(weekStartStr);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // agrupa por dia e hora
    const taskMap = React.useMemo(() => {
        const map: Record<string, Record<number, Task[]>> = {};
        weekDays.forEach(day => {
            const key = toDateString(day);
            getTasksForDate(tasks, key).forEach(task => {
                let hour = 0;
                if (task.deadlineTime) {
                    const [hh] = task.deadlineTime.split(':');
                    hour = parseInt(hh, 10) || 0;
                }
                if (!map[key]) map[key] = {};
                if (!map[key][hour]) map[key][hour] = [];
                map[key][hour].push(task);
            });
        });
        return map;
    }, [tasks, weekDays]);

    return (
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {/* cabecalho dos dias */}
            <View style={[styles.weekHeader, { borderBottomColor: colors.divider }]}>
                <View style={{ width: HOUR_COL_WIDTH }} />
                {weekDays.map((day) => {
                    const isToday    = isSameDay(day, today);
                    const isSelected = toDateString(day) === selectedDate;
                    return (
                        <TouchableOpacity
                            key={toDateString(day)}
                            style={styles.dayHeaderCol}
                            onPress={() => onDayPress(toDateString(day))}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dayName, { color: colors.textMuted }]}>
                                {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                            </Text>
                            <View style={[
                                styles.dayNumCircle,
                                isToday    && { backgroundColor: colors.calendarDayToday },
                                isSelected && { backgroundColor: colors.calendarDaySelected },
                            ]}>
                                <Text style={[
                                    styles.dayNum,
                                    { color: colors.calendarDayText },
                                    isToday    && { color: colors.calendarDayTodayText, fontWeight: '700' },
                                    isSelected && { color: colors.calendarDaySelectedText, fontWeight: '700' },
                                ]}>
                                    {format(day, 'd')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* grade de horas com scroll vertical */}
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                    <View style={[styles.hourCol, { width: HOUR_COL_WIDTH, borderRightColor: colors.divider }]}>
                        {HOURS.map(h => (
                            <View key={h} style={[styles.hourCell, { height: HOUR_HEIGHT }]}>
                                <Text style={[styles.hourText, { color: colors.textMuted }]}>
                                    {String(h).padStart(2, '0')}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {weekDays.map((day) => {
                        const dayStr   = toDateString(day);
                        const dayTasks = taskMap[dayStr] ?? {};
                        return (
                            <View key={dayStr} style={styles.dayCol}>
                                {HOURS.map(h => {
                                    const hourTasks = dayTasks[h] ?? [];
                                    return (
                                        <View key={h} style={[styles.cell, {
                                            height: HOUR_HEIGHT,
                                            borderBottomColor: colors.divider,
                                            borderLeftColor: colors.divider,
                                        }]}>
                                            {hourTasks.map(task => {
                                                const cfg = TASK_PRIORITIES[task.priority as keyof typeof TASK_PRIORITIES] ?? TASK_PRIORITIES.none;
                                                const priorityColor = colors[cfg.colorKey as keyof typeof colors] as string;
                                                return (
                                                    <TouchableOpacity
                                                        key={task.id}
                                                        style={[styles.chip, {
                                                            backgroundColor: priorityColor + '28',
                                                            borderLeftColor: priorityColor,
                                                        }]}
                                                        onPress={() => router.push(`/task/${task.id}`)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={2}>
                                                            {task.title}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

// reactive por semana — busca tasks do domingo ao sabado
const WeekGridEnhanced = withObservables(['weekStartStr'], () => ({
    tasks: database.get<Task>('tasks')
        .query()
        .observe(),
}))(WeekGrid);

// ── WeekView com scroll lateral ───────────────────────────────────────────────

export default function WeekView({ selectedDate, onDayPress, onWeekChange }: OuterProps) {
    const flatRef = useRef<FlatList>(null);

    const baseWeekStart = startOfWeek(parseDateString(selectedDate), { weekStartsOn: 0 });
    const weeks = Array.from({ length: WEEK_RANGE * 2 + 1 }, (_, i) =>
        toDateString(addWeeks(baseWeekStart, i - WEEK_RANGE))
    );
    const initialIndex = WEEK_RANGE;

    const handleScrollEnd = useCallback((e: any) => {
        const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const weekStart = weeks[pageIndex];
        if (weekStart) onWeekChange(weekStart);
    }, [weeks, onWeekChange]);

    return (
        <FlatList
            ref={flatRef}
            data={weeks}
            keyExtractor={(w) => w}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={({ item: weekStartStr }) => (
                <WeekGridEnhanced
                    weekStartStr={weekStartStr}
                    selectedDate={selectedDate}
                    onDayPress={onDayPress}
                />
            )}
        />
    );
}

const styles = StyleSheet.create({
    weekHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    dayHeaderCol: { flex: 1, alignItems: 'center', gap: 4 },
    dayName: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },
    dayNumCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    dayNum: { fontSize: 12, fontWeight: '500' },
    grid: { flexDirection: 'row', paddingBottom: 40 },
    hourCol: { borderRightWidth: StyleSheet.hairlineWidth },
    hourCell: { justifyContent: 'flex-start', paddingTop: 2, paddingRight: 6, alignItems: 'flex-end' },
    hourText: { fontSize: 10, fontVariant: ['tabular-nums'] },
    dayCol: { flex: 1 },
    cell: { borderBottomWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, padding: 1, gap: 1 },
    chip: { borderLeftWidth: 2, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 2 },
    chipText: { fontSize: 9, fontWeight: '600', lineHeight: 12 },
});
