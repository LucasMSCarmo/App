import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { getOccurrenceDatesInRange } from '@/src/utils/taskRecurrence';
import { Q } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { format, getDay, getDaysInMonth, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useCallback, useRef } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView, StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 12;
const COL_GAP = 8;
const COLS = 3;
const MONTH_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - COL_GAP * (COLS - 1)) / COLS;
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const YEAR_RANGE = 10;

interface OuterProps {
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
    onYearChange: (year: number) => void;
}

const MiniMonth = React.memo(function MiniMonth({
    year, month, selectedDate, markedDates, onDayPress,
}: {
    year: number;
    month: number;
    selectedDate: string;
    markedDates: Set<string>;
    onDayPress: (dateStr: string) => void;
}) {
    const { colors } = useTheme();
    const today = new Date();
    const firstDay = startOfMonth(new Date(year, month, 1));
    const offset = getDay(firstDay);
    const daysInMonth = getDaysInMonth(firstDay);
    const cells: (number | null)[] = [
        ...Array(offset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const monthLabel = format(firstDay, 'MMM', { locale: ptBR });

    return (
        <View style={[styles.wrap, { width: MONTH_WIDTH }]}>
            <Text style={[styles.label, { color: colors.text }]}>{monthLabel}</Text>
            <View style={styles.weekRow}>
                {WEEK_DAYS.map((d, i) => (
                    <Text key={i} style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
                ))}
            </View>
            <View style={styles.grid}>
                {cells.map((day, idx) => {
                    if (!day) return <View key={`e-${idx}`} style={styles.cell} />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = isSameDay(new Date(year, month, day), today);
                    const isSelected = dateStr === selectedDate;
                    const hasEvent = markedDates.has(dateStr);
                    return (
                        <TouchableOpacity key={dateStr} style={styles.cell} onPress={() => onDayPress(dateStr)} activeOpacity={0.7}>
                            <View style={[
                                styles.dayBox,
                                hasEvent && {
                                    borderColor: colors.calendarDayHasEvent,
                                    backgroundColor: colors.surface,
                                },
                                isToday && {
                                    borderColor: colors.calendarDayToday,
                                    backgroundColor: colors.calendarDayToday,
                                },
                                isSelected && {
                                    borderColor: colors.calendarDaySelected,
                                    backgroundColor: colors.calendarDaySelected,
                                },
                            ]}>
                            <Text style={[
                                styles.dayText,
                                { color: colors.calendarDayText },
                                isToday && { color: colors.calendarDayTodayText, fontWeight: '700' },
                                isSelected && { color: colors.calendarDaySelectedText, fontWeight: '700' },
                            ]}>
                                {day}
                            </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
});

interface YearPageProps {
    year: number;
    selectedDate: string;
    tasks: Task[];
    onDayPress: (dateStr: string) => void;
}

function YearPage({ year, selectedDate, tasks, onDayPress }: YearPageProps) {

    const markedDates = React.useMemo(() => {
        return new Set(getOccurrenceDatesInRange(tasks, `${year}-01-01`, `${year}-12-31`));
    }, [tasks, year]);

    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.monthsGrid}>
                {Array.from({ length: 4 }, (_, row) => (
                    <View key={row} style={styles.monthsRow}>
                        {months.slice(row * 3, row * 3 + 3).map(month => (
                            <MiniMonth
                                key={month}
                                year={year}
                                month={month}
                                selectedDate={selectedDate}
                                markedDates={markedDates}
                                onDayPress={onDayPress}
                            />
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const YearPageEnhanced = withObservables(['year'], () => {
    return {
        tasks: database.get<Task>('tasks')
            .query(Q.where('deadline_date', Q.notEq(null)))
            .observe(),
    };
})(YearPage);

export default function YearView({ selectedDate, onDayPress, onYearChange }: OuterProps) {
    const flatRef = useRef<FlatList>(null);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => currentYear - YEAR_RANGE + i);
    const initialIndex = YEAR_RANGE;

    const handleScrollEnd = useCallback((e: any) => {
        const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const year = years[pageIndex];
        if (year !== undefined) onYearChange(year);
    }, [years, onYearChange]);

    return (
        <FlatList
            ref={flatRef}
            data={years}
            keyExtractor={(y) => String(y)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={({ item: year }) => (
                <YearPageEnhanced
                    year={year}
                    selectedDate={selectedDate}
                    onDayPress={onDayPress}
                />
            )}
        />
    );
}

const styles = StyleSheet.create({
    wrap: { paddingBottom: 4 },
    label: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
    weekRow: { flexDirection: 'row', marginBottom: 3 },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayBox: {
        width: '88%',
        maxWidth: 23,
        aspectRatio: 1,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: { fontSize: 11, fontWeight: '700' },
    yearHeader: { paddingHorizontal: H_PADDING, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    yearLabel: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    monthsGrid: {
        flexGrow: 1,
        paddingHorizontal: H_PADDING,
        paddingTop: 14,
        paddingBottom: 18,
        justifyContent: 'space-between',
        gap: 22,
    },
    monthsRow: { flexDirection: 'row', gap: COL_GAP, justifyContent: 'space-between' },
});
