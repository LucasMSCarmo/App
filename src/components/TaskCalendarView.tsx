import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Sidebar } from '@/src/components/Sidebar';
import {
    TODAY,
    headerDay,
    headerWeek,
    headerMonth,
    headerYear,
    headerPlanner,
    startOfWeekStr,
} from '@/src/utils/dateHelpers';
import CalendarHeader from '@/src/components/CalendarHeader';
import MonthView from '@/src/components/MonthView';
import DayView from '@/src/components/DayView';
import WeekView from '@/src/components/WeekView';
import YearView from '@/src/components/YearView';
import PlannerView from '@/src/components/PlannerView';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'planner';

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string; icon: string }[] = [
    { mode: 'day',     label: 'Dia',    icon: 'calendar-today-outline' },
    { mode: 'week',    label: 'Semana', icon: 'calendar-week-outline' },
    { mode: 'month',   label: 'Mes',    icon: 'calendar-text-outline' },
    { mode: 'year',    label: 'Ano',    icon: 'calendar-month-outline' },
    { mode: 'planner', label: 'Agenda', icon: 'format-list-bulleted' },
];

export default function TaskCalendarView() {
    const { colors } = useTheme();

    const [leftMenuVisible, setLeftMenuVisible] = useState(false);
    const [viewMode, setViewMode]               = useState<CalendarViewMode>('month');
    const [selectedDate, setSelectedDate]       = useState(TODAY);

    // cada view controla seu proprio periodo visivel e notifica aqui
    const [visibleDay,   setVisibleDay]   = useState(TODAY);
    const [visibleWeek,  setVisibleWeek]  = useState(startOfWeekStr(TODAY));
    const [visibleMonth, setVisibleMonth] = useState(TODAY.substring(0, 7) + '-01');
    const [visibleYear,  setVisibleYear]  = useState(new Date().getFullYear());
    const [visiblePlanner, setVisiblePlanner] = useState(TODAY);

    const handleTodayPress = () => {
        setSelectedDate(TODAY);
        setVisibleDay(TODAY);
        setVisibleWeek(startOfWeekStr(TODAY));
        setVisibleMonth(TODAY.substring(0, 7) + '-01');
        setVisibleYear(new Date().getFullYear());
    };

    const handleYearDayPress = (dateStr: string) => {
        setSelectedDate(dateStr);
        setVisibleMonth(dateStr.substring(0, 7) + '-01');
        setVisibleYear(Number(dateStr.substring(0, 4)));
        setViewMode('month');
    };

    // label do header varia por view e pelo periodo visivel
    const headerLabel = (() => {
        switch (viewMode) {
            case 'day':     return headerDay(visibleDay);
            case 'week':    return headerWeek(visibleWeek);
            case 'month':   return headerMonth(visibleMonth);
            case 'year':    return headerYear(visibleYear);
            case 'planner': return headerPlanner(visiblePlanner);
        }
    })();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

            <CalendarHeader
                label={headerLabel}
                onMenuPress={() => setLeftMenuVisible(true)}
                onTodayPress={handleTodayPress}
            />

            <Sidebar visible={leftMenuVisible} onClose={() => setLeftMenuVisible(false)} side="left">
                <Text style={[styles.sidebarTitle, { color: colors.text }]}>Visualizacao</Text>
                {VIEW_OPTIONS.map(({ mode, label, icon }) => {
                    const isActive = viewMode === mode;
                    return (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.menuItem, isActive && { backgroundColor: colors.primarySurface }]}
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

            {viewMode === 'month' && (
                <MonthView
                    selectedDate={selectedDate}
                    onDayPress={setSelectedDate}
                    onMonthChange={(monthKey: string) => {
                        setVisibleMonth(monthKey);
                        setSelectedDate(monthKey.substring(0, 7) + '-' + selectedDate.substring(8));
                    }}
                />
            )}
            {viewMode === 'day' && (
                <DayView
                    selectedDate={selectedDate}
                    onDayChange={setVisibleDay}
                />
            )}
            {viewMode === 'week' && (
                <WeekView
                    selectedDate={selectedDate}
                    onDayPress={setSelectedDate}
                    onWeekChange={setVisibleWeek}
                />
            )}
            {viewMode === 'year' && (
                <YearView
                    selectedDate={selectedDate}
                    onDayPress={handleYearDayPress}
                    onYearChange={setVisibleYear}
                />
            )}
            {viewMode === 'planner' && (
                <PlannerView onVisibleDateChange={setVisiblePlanner} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    sidebarTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 20, paddingHorizontal: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 6 },
    menuIconWrap: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    menuText: { flex: 1, fontSize: 15, fontWeight: '500' },
    menuActiveDot: { width: 6, height: 6, borderRadius: 3 },
});
