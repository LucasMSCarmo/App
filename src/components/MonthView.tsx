import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { formatDayLabel, toMonthKey } from '@/src/utils/dateHelpers';
import { getOccurrenceDatesInRange, getTasksForDate } from '@/src/utils/taskRecurrence';
import withObservables from '@nozbe/with-observables';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import TaskCard from '../components/TaskCard';

interface OuterProps {
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
    onMonthChange: (monthKey: string) => void;
}

interface InnerProps extends OuterProps {
    tasks: Task[];
}

function MonthView({ tasks, selectedDate, onDayPress, onMonthChange }: InnerProps) {
    const { colors, calendarTheme } = useTheme();
    const { day, weekday } = formatDayLabel(selectedDate);

    const tasksOfTheDay = useMemo(() => getTasksForDate(tasks, selectedDate), [tasks, selectedDate]);

    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        const [year, month] = selectedDate.split('-').map(Number);
        const startStr = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
        const endStr = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
        getOccurrenceDatesInRange(tasks, startStr, endStr).forEach(key => {
            marks[key] = {
                customStyles: {
                    container: {
                        borderWidth: 1,
                        borderColor: colors.calendarDayHasEvent,
                        borderRadius: 7,
                        backgroundColor: colors.surface,
                    },
                    text: {
                        color: colors.calendarDayText,
                        fontWeight: '700',
                    },
                },
            };
        });
        marks[selectedDate] = {
            ...marks[selectedDate],
            customStyles: {
                container: {
                    borderWidth: 1,
                    borderColor: colors.calendarDaySelected,
                    borderRadius: 7,
                    backgroundColor: colors.calendarDaySelected,
                },
                text: {
                    color: colors.calendarDaySelectedText,
                    fontWeight: '700',
                },
            },
        };
        return marks;
    }, [tasks, selectedDate, colors.calendarDayHasEvent, colors.calendarDaySelected, colors.calendarDaySelectedText, colors.calendarDayText, colors.surface]);

    return (
        <View style={{ flex: 1 }}>
            <Calendar
                current={selectedDate}
                theme={calendarTheme}
                markedDates={markedDates}
                markingType="custom"
                onDayPress={(d) => onDayPress(d.dateString)}
                onMonthChange={(m) => onMonthChange(toMonthKey(m.year, m.month))}
                style={styles.calendar}
                hideExtraDays={false}
                enableSwipeMonths
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.dayLabelRow}>
                <Text style={[styles.dayNumber, { color: colors.text }]}>{day}</Text>
                <Text style={[styles.dayWeekday, { color: colors.textMuted }]}>{weekday}</Text>
            </View>

            <FlatList
                data={tasksOfTheDay}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Nenhuma tarefa para este dia
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TaskCard
                        task={item}
                        variant="calendar"
                        showDate={false}
                        showTime
                        showStatus={false}
                        showDescription={false}
                    />
                )}
            />
        </View>
    );
}

const enhance = withObservables(['selectedDate'], () => {
    return {
        tasks: database.get<Task>('tasks')
            .query()
            .observe(),
    };
});

export default enhance(MonthView);

const styles = StyleSheet.create({
    calendar: { paddingBottom: 8 },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginBottom: 12 },
    dayLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
    dayNumber: { fontSize: 22, fontWeight: '700' },
    dayWeekday: { fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },
    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 14 },
});
