import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { Q } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../contexts/ThemeContext';
import TaskItem from './TaskItem';

function toCalendarDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ─── Lista reativa por dia ────────────────────────────────────────────────────

const TasksList = withObservables(['selectedDate'], ({ selectedDate }: { selectedDate: Date }) => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return {
        tasks: database.get<Task>('tasks')
            .query(Q.where('deadline_date', dateStr))
            .observe(),
    };
})(({ tasks, colors }: { tasks: Task[]; colors: any }) => (
    <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Nenhuma tarefa para este dia
                </Text>
            </View>
        }
        renderItem={({ item }) => <TaskItem task={item} type={'calendar-month'} />}
    />
));

// ─── CalendarMonth ────────────────────────────────────────────────────────────

function CalendarMonth() {
    const { colors } = useTheme();
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Formato correto: YYYY-MM-DD
    const selectedDateString = toCalendarDateString(selectedDate);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Calendar
                current={selectedDateString}
                onDayPress={(day) => {
                    const [year, month, dayNum] = day.dateString.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, dayNum));
                }}
                markedDates={{
                    [selectedDateString]: {
                        selected: true,
                        selectedColor: colors.primary,
                    },
                }}
                theme={{
                    calendarBackground: colors.calendarBackground,
                    textSectionTitleColor: colors.calendarWeekHeader,
                    dayTextColor: colors.calendarDayText,
                    todayTextColor: colors.calendarDayTodayText,
                    todayBackgroundColor: colors.calendarDayToday,
                    monthTextColor: colors.calendarHeaderText,
                    selectedDayBackgroundColor: colors.calendarDaySelected,
                    selectedDayTextColor: colors.calendarDaySelectedText,
                    dotColor: colors.calendarDayHasEvent,
                    arrowColor: colors.primary,
                    textDisabledColor: colors.calendarDayTextDisabled,
                }}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedDate.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                })}  {selectedDate.toLocaleDateString('pt-BR', {
                    weekday: 'short',
                })}
            </Text>

            <TasksList selectedDate={selectedDate} colors={colors} />
        </View>
    );
}

export default CalendarMonth;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 12,
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
        textTransform: 'capitalize',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    emptyState: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
});