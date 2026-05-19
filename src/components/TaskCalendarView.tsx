import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { useTheme } from '@/src/contexts/ThemeContext';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TASK_PRIORITIES, TASK_STATUS } from '@/src/constants/taskConstants';
import { Sidebar } from '@/src/components/Sidebar';
import { TaskFilters } from '@/src/components/TaskFilters';
import { useAuth } from '../contexts/AuthContext';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'planner';

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string; icon: string }[] = [
    { mode: 'day', label: 'Dia', icon: 'calendar-today-outline' },
    { mode: 'week', label: 'Semana', icon: 'calendar-week-outline' },
    { mode: 'month', label: 'Mês', icon: 'calendar-text-outline' },
    { mode: 'year', label: 'Ano', icon: 'calendar-month-outline' },
    { mode: 'planner', label: 'Agenda', icon: 'format-list-bulleted' },
];

// ─── Subtask progress ─────────────────────────────────────────────────────────

const TaskProgressInfo = withObservables(['task'], ({ task }: { task: Task }) => ({
    completed: task.subtasks.extend(Q.where('status', true)).observeCount(),
    total: task.subtasks.observeCount(),
}))(({ completed, total, colors }: any) => {
    if (total === 0) return null;
    return (
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {completed} de {total} {total === 1 ? 'subtarefa' : 'subtarefas'} concluída{completed !== 1 ? 's' : ''}
        </Text>
    );
});

// ─── Calendar theme ───────────────────────────────────────────────────────────

const getCalendarTheme = (colors: any) => ({
    calendarBackground: colors.background,
    textSectionTitleColor: colors.textSecondary,
    dayTextColor: colors.text,
    todayTextColor: colors.primary,
    monthTextColor: colors.text,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: colors.textOnPrimary,
    dotColor: colors.primary,
    arrowColor: colors.primary,
    disabledArrowColor: colors.textMuted,
    textDisabledColor: colors.textMuted,
});

// ─── Main ─────────────────────────────────────────────────────────────────────

function TaskCalendarView({ tasks }: { tasks: Task[] }) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();

    const [leftMenuVisible, setLeftMenuVisible] = useState(false);
    const [rightMenuVisible, setRightMenuVisible] = useState(false);
    const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Filtros
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [createdByMe, setCreatedByMe] = useState('me');

    const activeFiltersCount = [
        selectedStatus.length > 0,
        selectedPriorities.length > 0,
        createdByMe === 'me',
    ].filter(Boolean).length;

    // Tarefas filtradas
    const filteredTasks = useMemo(() => tasks.filter(task => {
        if (selectedStatus.length > 0 && !selectedStatus.includes(task.status)) return false;
        if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) return false;
        if (createdByMe === 'me' && task.createdBy !== user?.id) return false;
        return true;
    }), [tasks, selectedStatus, selectedPriorities, createdByMe, user?.id]);

    const tasksOfTheDay = useMemo(() => filteredTasks
        .filter(task => task.deadline && format(new Date(task.deadline), 'yyyy-MM-dd') === selectedDate)
        .sort((a, b) => (a.deadline ?? 0) > (b.deadline ?? 0) ? 1 : -1),
        [filteredTasks, selectedDate]
    );

    const agendaItems = useMemo(() => {
        const items: { [key: string]: Task[] } = {};
        filteredTasks.forEach(task => {
            if (task.deadline) {
                const key = format(new Date(task.deadline), 'yyyy-MM-dd');
                if (!items[key]) items[key] = [];
                items[key].push(task);
            }
        });
        return items;
    }, [filteredTasks]);

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

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity
                    onPress={() => setLeftMenuVisible(true)}
                    style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="menu" size={20} color={colors.text} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {/*format(new Date(selectedDate), "dd 'de' MMMM", { locale: require('date-fns/locale/pt-BR') })*/}
                </Text>

                <TouchableOpacity
                    onPress={() => setRightMenuVisible(true)}
                    style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="options-outline"
                        size={20}
                        color={activeFiltersCount > 0 ? colors.primary : colors.text}
                    />
                    {activeFiltersCount > 0 && (
                        <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Sidebar esquerda — modo de visualização ── */}
            <Sidebar visible={leftMenuVisible} onClose={() => setLeftMenuVisible(false)} side="left">
                <Text style={[styles.sidebarTitle, { color: colors.text }]}>Visualização</Text>
                {VIEW_OPTIONS.map(({ mode, label, icon }) => {
                    const isActive = viewMode === mode;
                    return (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                styles.menuItem,
                                { borderColor: colors.border },
                                isActive && { backgroundColor: colors.primarySurface },
                            ]}
                            onPress={() => { setViewMode(mode); setLeftMenuVisible(false); }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuIconWrap, { backgroundColor: isActive ? colors.primary : colors.surface }]}>
                                <MaterialCommunityIcons
                                    name={icon as any}
                                    size={18}
                                    color={isActive ? colors.textOnPrimary : colors.textSecondary}
                                />
                            </View>
                            <Text style={[styles.menuText, { color: isActive ? colors.primary : colors.text }]}>
                                {label}
                            </Text>
                            {isActive && <View style={[styles.menuActiveDot, { backgroundColor: colors.primary }]} />}
                        </TouchableOpacity>
                    );
                })}
            </Sidebar>

            {/* ── Sidebar direita — filtros ── */}
            <Sidebar visible={rightMenuVisible} onClose={() => setRightMenuVisible(false)} side="right">
                <TaskFilters
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    selectedPriorities={selectedPriorities}
                    setSelectedPriorities={setSelectedPriorities}
                    createdByMe={createdByMe}
                    setCreatedByMe={setCreatedByMe}
                    enabledFilters={['status', 'priority', 'createdByMe']}
                />
            </Sidebar>

            {/* ── Conteúdo ── */}
            <View style={{ flex: 1 }}>

                {/* Dia */}
                {viewMode === 'day' && (
                    <FlatList
                        data={tasksOfTheDay}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View>
                                {Array.from({ length: 24 }).map((_, i) => {
                                    const hour = i.toString().padStart(2, '0') + ':00';
                                    return (
                                        <View key={hour} style={styles.timelineRow}>
                                            <View style={styles.hourContainer}>
                                                <Text style={[styles.hourText, { color: colors.textMuted }]}>{hour}</Text>
                                                <View style={[styles.timelineLine, { backgroundColor: colors.divider }]} />
                                            </View>
                                            <View style={[styles.hourSlot, { borderBottomColor: colors.divider }]} />
                                        </View>
                                    );
                                })}
                            </View>
                        }
                        renderItem={({ item }) => {
                            const priorityConfig = TASK_PRIORITIES[item.priority as keyof typeof TASK_PRIORITIES] ?? TASK_PRIORITIES.none;
                            const priorityColor = colors[priorityConfig.colorKey];
                            return (
                                <View style={styles.timelineRow}>
                                    <View style={styles.hourContainer}>
                                        <Text style={[styles.hourText, { color: colors.textSecondary }]}>
                                            {item.deadline ? format(new Date(item.deadline), 'HH:mm') : '--:--'}
                                        </Text>
                                        <View style={[styles.timelineLine, { backgroundColor: colors.primary + '40' }]} />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.taskCardDay, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                                        onPress={() => router.push(`/task/${item.id}`)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.priorityTag, { backgroundColor: priorityColor }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                                            <TaskProgressInfo task={item} colors={colors} />
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />
                )}

                {/* Semana */}
                {viewMode === 'week' && (
                    <CalendarList
                        horizontal
                        pagingEnabled
                        calendarWidth={360}
                        theme={getCalendarTheme(colors)}
                        markedDates={markedDates}
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                    />
                )}

                {/* Mês */}
                {viewMode === 'month' && (
                    <Calendar
                        theme={getCalendarTheme(colors)}
                        markedDates={markedDates}
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                    />
                )}

                {/* Ano */}
                {viewMode === 'year' && (
                    <CalendarList
                        theme={getCalendarTheme(colors)}
                        pastScrollRange={12}
                        futureScrollRange={12}
                        scrollEnabled
                        showScrollIndicator
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                    />
                )}

                {/* Agenda */}
                {viewMode === 'planner' && (
                    <Agenda
                        items={agendaItems as any}
                        selected={selectedDate}
                        renderItem={(reservation: any) => {
                            const task = reservation as Task;
                            return (
                                <TouchableOpacity
                                    onPress={() => router.push(`/task/${task.id}`)}
                                    style={[styles.itemCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.itemTitle, { color: colors.text }]}>{task.title}</Text>
                                        <TaskProgressInfo task={task} colors={colors} />
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            );
                        }}
                        renderEmptyDate={() => (
                            <View style={styles.emptyDate}>
                                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sem tarefas</Text>
                            </View>
                        )}
                        theme={{
                            agendaKnobColor: colors.primary,
                            backgroundColor: colors.background,
                            calendarBackground: colors.cardBackground,
                            reservationsBackgroundColor: colors.background,
                            agendaDayTextColor: colors.text,
                            agendaDayNumColor: colors.text,
                            agendaTodayColor: colors.primary,
                            dotColor: colors.primary,
                            selectedDayBackgroundColor: colors.primary,
                        }}
                    />
                )}
            </View>
        </View>
    );
}

// ─── Enhance ──────────────────────────────────────────────────────────────────

const enhance = withObservables([], () => ({
    tasks: database.get<Task>('tasks').query(Q.sortBy('deadline', Q.asc)).observe(),
}));

export default enhance(TaskCalendarView);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
        textTransform: 'capitalize',
    },
    filterBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },

    // View mode menu
    sidebarTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        marginBottom: 6,
    },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    menuActiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // Day view
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    timelineRow: {
        flexDirection: 'row',
        minHeight: 60,
        marginBottom: 8,
    },
    hourContainer: {
        width: 52,
        alignItems: 'center',
        paddingTop: 2,
    },
    hourText: {
        fontSize: 12,
        fontWeight: '500',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 6,
        borderRadius: 1,
    },
    hourSlot: {
        flex: 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginLeft: 10,
    },
    taskCardDay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        marginLeft: 10,
        gap: 10,
        overflow: 'hidden',
    },
    priorityTag: {
        width: 4,
        alignSelf: 'stretch',
        borderRadius: 2,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        marginBottom: 2,
    },
    progressText: {
        fontSize: 12,
        marginTop: 2,
    },

    // Planner
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginRight: 16,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 10,
    },
    emptyDate: {
        height: 48,
        justifyContent: 'center',
        paddingHorizontal: 16,
        marginTop: 12,
    },
});