import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, FlatList, Modal } from 'react-native';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { useTheme } from '@/src/contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TASK_PRIORITIES, TASK_STATUS } from '@/src/constants/taskConstants';
import { Sidebar } from '@/src/components/Sidebar';
import { TaskFilters } from '@/src/components/TaskFilters';
import { useAuth } from '../contexts/AuthContext';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'planner';

function TaskCalendarView({ tasks }: { tasks: Task[] }) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const [leftMenuVisible, setLeftMenuVisible] = useState(false);
    const [rightMenuVisible, setRightMenuVisible] = useState(false);
    const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [createdByMe, setCreatedByMe] = useState('me');

    // Estado dos Filtros
    const [filters, setFilters] = useState({
        showCompleted: true,
        priorities: ['ALTA', 'MEDIA', 'BAIXA']
    });

    // 1. Lógica de Filtro Aplicada
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesStatus = filters.showCompleted ? true : task.status !== 'concluida';
            const matchesPriority = filters.priorities.includes(task.priority?.toUpperCase());
            return matchesStatus && matchesPriority;
        });
    }, [tasks, filters]);

    // 2. Lógica de Visualização (usando as tarefas já filtradas)
    const tasksOfTheDay = useMemo(() => {
        return filteredTasks.filter(task => {
            if (!task.deadline) return false;
            return format(new Date(task.deadline), 'yyyy-MM-dd') === selectedDate;
        }).sort((a, b) => (a.deadline || 0) > (b.deadline || 0) ? 1 : -1);
    }, [filteredTasks, selectedDate]);

    const agendaItems = useMemo(() => {
        const items: { [key: string]: Task[] } = {};
        tasks.forEach(task => {
            if (task.deadline) {
                const dateStr = format(new Date(task.deadline), 'yyyy-MM-dd');
                if (!items[dateStr]) items[dateStr] = [];
                items[dateStr].push(task);
            }
        });
        return items;
    }, [tasks]);

    const markedDates = useMemo(() => {
        const marks: any = {};
        Object.keys(agendaItems).forEach(date => {
            marks[date] = { marked: true, dotColor: colors.primary };
        });
        marks[selectedDate] = {
            ...marks[selectedDate],
            selected: true,
            selectedColor: colors.primary,
        };
        return marks;
    }, [agendaItems, selectedDate, colors.primary]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* HEADER CUSTOMIZADO */}
            <View style={[styles.header, { borderBottomColor: colors.primary + '20' }]}>
                <TouchableOpacity onPress={() => setLeftMenuVisible(true)}>
                    <Ionicons name="menu" size={28} color={colors.text} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {selectedDate}
                </Text>

                <TouchableOpacity onPress={() => setRightMenuVisible(true)}>
                    <Ionicons name="filter" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <Modal visible={leftMenuVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setLeftMenuVisible(false)}
                >
                    <View style={[styles.sidebarLeft, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.sidebarTitle, { color: colors.primary }]}>Visualização</Text>

                        {[
                            { mode: 'day', label: 'Dia', icon: 'calendar-today-outline' },
                            { mode: 'week', label: 'Semana', icon: 'calendar-week-outline' },
                            { mode: 'month', label: 'Mês', icon: 'calendar-text-outline' },
                            { mode: 'year', label: 'Ano', icon: 'calendar-month-outline' },
                            { mode: 'planner', label: 'Agenda', icon: 'format-list-bulleted' }
                        ].map(({ mode, label, icon }) => (
                            <TouchableOpacity
                                key={mode}
                                style={[
                                    styles.menuItem,
                                    viewMode === mode && { backgroundColor: colors.primary + '20' }
                                ]}
                                onPress={() => {
                                    setViewMode(mode as any);
                                    setLeftMenuVisible(false);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={icon as any}
                                    size={20}
                                    color={viewMode === mode ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[styles.menuText, { color: colors.text, textTransform: 'capitalize' }]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Sidebar
                visible={rightMenuVisible}
                onClose={() => setRightMenuVisible(false)}
                side="right"
            >
                <TaskFilters
                    createdByMe={createdByMe}
                    setCreatedByMe={setCreatedByMe}
                    enabledFilters={['createdByMe']}
                />
            </Sidebar>

            <View style={{ flex: 1 }}>
                {viewMode === 'day' && (
                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={tasksOfTheDay}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 20 }}
                            ListEmptyComponent={
                                <View style={styles.center}>
                                    {Array.from({ length: 24 }).map((_, i) => {
                                        const hour = i.toString().padStart(2, '0') + ':00';
                                        return (
                                            <View key={hour} style={styles.timelineRow}>
                                                <View style={styles.hourContainer}>
                                                    <Text style={[styles.hourText, { color: colors.textSecondary }]}>
                                                        {hour}
                                                    </Text>
                                                    <View style={[styles.timelineLine, { backgroundColor: colors.primary + '20' }]} />
                                                </View>

                                                <View style={{ flex: 1, height: 60, borderBottomWidth: 1, borderBottomColor: colors.primary + '10' }} />
                                            </View>
                                        );
                                    })}
                                </View>
                            }
                            renderItem={({ item }) => {
                                const priorityConfig = TASK_PRIORITIES[item.priority as keyof typeof TASK_PRIORITIES];
                                const statusConfig = TASK_STATUS[item.status as keyof typeof TASK_STATUS];
                                return (
                                    <View style={styles.timelineRow}>
                                        <View style={styles.hourContainer}>
                                            <Text style={[styles.hourText, { color: colors.text }]}>
                                                {item.deadline ? format(new Date(item.deadline), 'HH:mm') : '--:--'}
                                            </Text>
                                            <View style={[styles.timelineLine, { backgroundColor: colors.primary + '40' }]} />
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.taskCardDay, { backgroundColor: colors.surface }]}
                                            onPress={() => router.push(`/task/${item.id}`)}
                                        >
                                            <View style={[styles.priorityTag, { backgroundColor: priorityConfig?.color }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                                                <TaskProgressInfo task={item} colors={colors} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )
                            }}
                        />
                    </View>
                )}

                {viewMode === 'week' && (
                    <CalendarList
                        horizontal={true}
                        pagingEnabled={true}
                        calendarWidth={360}
                        theme={getCalendarTheme(colors)}
                        markedDates={markedDates}
                    />
                )}

                {viewMode === 'month' && (
                    <Calendar
                        theme={getCalendarTheme(colors)}
                        markedDates={markedDates}
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                    />
                )}

                {viewMode === 'year' && (
                    <CalendarList
                        theme={getCalendarTheme(colors)}
                        pastScrollRange={12}
                        futureScrollRange={12}
                        scrollEnabled={true}
                        showScrollIndicator={true}
                    />
                )}

                {viewMode === 'planner' && (
                    <Agenda
                        items={agendaItems as any}
                        selected={selectedDate}
                        renderItem={(reservation: any) => {
                            const task = reservation as Task;
                            return (
                                <TouchableOpacity
                                    onPress={() => router.push(`/task/${task.id}`)}
                                    style={[styles.itemCard, { backgroundColor: colors.surface }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.itemTitle, { color: colors.text }]}>{task.title}</Text>
                                        <TaskProgressInfo task={task} colors={colors} />
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            );
                        }}
                        theme={{
                            agendaKnobColor: colors.primary,
                            backgroundColor: colors.background,
                            calendarBackground: colors.surface,
                        }}
                    />
                )}
            </View>
        </View>
    );
}

const getCalendarTheme = (colors: any) => ({
    calendarBackground: colors.background,
    textSectionTitleColor: colors.primary,
    dayTextColor: colors.text,
    todayTextColor: colors.primary,
    monthTextColor: colors.text,
    selectedDayBackgroundColor: colors.primary,
    dotColor: colors.primary,
    arrowColor: colors.primary,
});

const TaskProgressInfo = withObservables(['task'], ({ task }: { task: Task }) => ({
    completed: task.subtasks.extend(Q.where('status', true)).observeCount(),
    total: task.subtasks.observeCount(),
}))(({ completed, total, colors }: any) => (
    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        {completed} de {total} subtasks concluídas
    </Text>
));

const enhance = withObservables([], () => ({
    tasks: database.get<Task>('tasks').query(
        Q.sortBy('deadline', Q.asc)
    ).observe(),
}));

export default enhance(TaskCalendarView);

const styles = StyleSheet.create({
    container: { flex: 1 },
    viewSelector: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: 5
    },
    modeBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    modeText: { fontSize: 12, fontWeight: 'bold' },
    itemCard: {
        padding: 15,
        marginRight: 15,
        marginTop: 15,
        borderRadius: 12,
        elevation: 2
    },
    itemTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    hourContainer: {
        width: 60,
        alignItems: 'center',
    },
    hourText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 5,
    },
    taskCardDay: {
        flex: 1,
        padding: 15,
        borderRadius: 15,
        flexDirection: 'row',
        marginLeft: 10,
        elevation: 3,
    },
    priorityTag: {
        width: 5,
        height: '100%',
        borderRadius: 5,
        marginRight: 15,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    sidebarLeft: {
        height: '100%',
        width: '60%',
        padding: 20,
        paddingTop: 50,
        elevation: 5,
    },
    sidebarRight: {
        height: '100%',
        width: '75%',
        alignSelf: 'flex-end',
        padding: 20,
        paddingTop: 50,
        elevation: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
    },
    sidebarTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    menuText: { marginLeft: 15, fontWeight: '500' },
    filterSection: { marginTop: 20 },
    filterOption: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
});