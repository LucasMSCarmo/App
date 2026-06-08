import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { parseDateString, toDateString } from '@/src/utils/dateHelpers';
import { getTasksForDate } from '@/src/utils/taskRecurrence';
import withObservables from '@nozbe/with-observables';
import { addDays, format } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import TaskCard from './TaskCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_RANGE = 365;

interface OuterProps {
    selectedDate: string;
    onDayChange: (dateStr: string) => void;
}

function DayGrid({ date, tasks }: { date: string; tasks: Task[] }) {
    const { colors } = useTheme();
    const scrollRef = useRef<ScrollView>(null);

    const dayTasks = useMemo(() => getTasksForDate(tasks, date), [tasks, date]);

    const allDayTasks = useMemo(() =>
        dayTasks.filter(t => !t.deadlineTime),
        [dayTasks]
    );

    const tasksByHour = useMemo(() =>
        dayTasks
            .filter(t => !!t.deadlineTime)
            .reduce<Record<number, Task[]>>((acc, task) => {
                const h = parseInt(task.deadlineTime!.split(':')[0], 10);
                if (!acc[h]) acc[h] = [];
                acc[h].push(task);
                return acc;
            }, {}),
        [dayTasks]
    );

    const isToday = date === format(new Date(), 'yyyy-MM-dd');
    const nowHour = new Date().getHours();

    useEffect(() => {
        const offset = Math.max(0, (nowHour - 1) * HOUR_HEIGHT);
        setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: false }), 100);
    }, [date, nowHour]);

    return (
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{ width: SCREEN_WIDTH }}>

            {/* ── tarefas sem horário ── */}
            {allDayTasks.length > 0 && (
                <View style={[styles.allDaySection, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.allDayLabel, { color: colors.textMuted }]}>Dia inteiro</Text>
                    <View style={styles.allDayList}>
                        {allDayTasks.map(task => (
                            <View key={task.id} style={styles.gridCard}>
                                <TaskCard
                                    task={task}
                                    variant="compact"
                                    showDate={false}
                                    showTime={false}
                                    showPriority={false}
                                    showProgress={false}
                                />
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── timeline de horas ── */}
            <View style={styles.timeline}>
                {HOURS.map((hour) => {
                    const isCurrentHour = isToday && hour === nowHour;
                    const hourTasks = tasksByHour[hour] ?? [];
                    return (
                        <View key={hour} style={[styles.row, { minHeight: HOUR_HEIGHT }]}>
                            <View style={styles.hourCol}>
                                <Text style={[styles.hourText, { color: isCurrentHour ? colors.primary : colors.textMuted }]}>
                                    {String(hour).padStart(2, '0')}:00
                                </Text>
                                {isCurrentHour && (
                                    <View style={styles.nowRow}>
                                        <View style={[styles.nowDot, { backgroundColor: colors.primary }]} />
                                        <View style={[styles.nowLine, { backgroundColor: colors.primary }]} />
                                    </View>
                                )}
                            </View>
                            <View style={[styles.separator, { backgroundColor: colors.divider }]} />
                            <View style={styles.eventCol}>
                                {hourTasks.length > 0 ? (
                                    <View style={styles.eventGrid}>
                                        {hourTasks.map((task) => (
                                            <View key={task.id} style={hourTasks.length >= 3 ? styles.gridCardThird : styles.gridCardHalf}>
                                                <TaskCard
                                                    task={task}
                                                    variant="compact"
                                                    showDate={false}
                                                    showTime
                                                    showPriority={false}
                                                    showProgress={false}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={[styles.emptySlot, { borderBottomColor: colors.divider }]} />
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const DayGridEnhanced = withObservables(['date'], ({ date }: { date: string }) => ({
    tasks: database.get<Task>('tasks')
        .query()
        .observe(),
}))(DayGrid);

function DayView({ selectedDate, onDayChange }: OuterProps) {
    const flatRef = useRef<FlatList>(null);

    const baseDate = parseDateString(selectedDate);
    const days = Array.from({ length: DAY_RANGE * 2 + 1 }, (_, i) =>
        toDateString(addDays(baseDate, i - DAY_RANGE))
    );
    const initialIndex = DAY_RANGE;

    const handleScrollEnd = useCallback((e: any) => {
        const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const date = days[pageIndex];
        if (date) onDayChange(date);
    }, [days, onDayChange]);

    return (
        <FlatList
            ref={flatRef}
            data={days}
            keyExtractor={(d) => d}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={({ item: date }) => <DayGridEnhanced date={date} />}
        />
    );
}

export default DayView;

const styles = StyleSheet.create({
    // ── dia inteiro ──
    allDaySection: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    allDayLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    allDayList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    timeline: {
        paddingTop: 8,
        paddingBottom: 40
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    hourCol: {
        width: 56,
        alignItems: 'flex-end',
        paddingRight: 10,
        paddingTop: 2,
        position: 'relative'
    },
    hourText: {
        fontSize: 11,
        fontWeight: '500',
        fontVariant: ['tabular-nums']
    },
    nowRow: {
        position: 'absolute',
        right: -4,
        top: 8, flexDirection: 'row',
        alignItems: 'center'
    },
    nowDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    nowLine: {
        width: 200,
        height: 1.5
    },
    separator: {
        width: StyleSheet.hairlineWidth,
        alignSelf: 'stretch'
    },
    eventCol: {
        flex: 1,
        paddingLeft: 10,
        paddingRight: 16,
        paddingBottom: 4,
        gap: 4
    },
    emptySlot: {
        height: HOUR_HEIGHT,
        borderBottomWidth: StyleSheet.hairlineWidth
    },
    eventGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingBottom: 4,
    },
    gridCard: {
        flexBasis: '48%',
        flexGrow: 1,
        minWidth: 116,
    },
    gridCardHalf: {
        flexBasis: '48%',
        flexGrow: 1,
        minWidth: 112,
    },
    gridCardThird: {
        flexBasis: '31%',
        flexGrow: 1,
        minWidth: 86,
    },
});
