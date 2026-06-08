import { useTheme } from '@/src/contexts/ThemeContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { toDateString } from '@/src/utils/dateHelpers';
import { getTasksForDate } from '@/src/utils/taskRecurrence';
import withObservables from '@nozbe/with-observables';
import { addDays, format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    SectionList,
    SectionListData,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import TaskCard from '../components/TaskCard';

const PAGE_SIZE = 60;

type SectionData = { title: string; dateStr: string; data: Task[] };

interface OuterProps {
    onVisibleDateChange: (dateStr: string) => void;
}

interface PlannerListProps {
    tasks: Task[];
    onVisibleDateChange: (dateStr: string) => void;
    onEndReached: () => void;
    onStartReached: () => void;
    loadingMore: boolean;
    startOffset: number;
    endOffset: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function sectionTitle(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
        .replace(/^\w/, c => c.toUpperCase());
}

// ── lista ─────────────────────────────────────────────────────────────────────

function PlannerList({
    tasks,
    onVisibleDateChange,
    onEndReached,
    onStartReached,
    loadingMore,
    startOffset,
    endOffset,
}: PlannerListProps) {
    const { colors } = useTheme();

    const sections = React.useMemo(() => {
        const today = new Date();
        const result: SectionData[] = [];
        for (let i = -startOffset; i <= endOffset; i++) {
            const dateStr = toDateString(addDays(today, i));
            const data = getTasksForDate(tasks, dateStr);
            if (data?.length > 0) {
                result.push({ title: sectionTitle(dateStr), dateStr, data });
            }
        }
        return result;
    }, [tasks, startOffset, endOffset]);

    const handleViewableChange = useCallback(({ viewableItems }: any) => {
        const first = viewableItems[0];
        if (first?.section?.dateStr) {
            onVisibleDateChange(first.section.dateStr);
        }
    }, [onVisibleDateChange]);

    if (sections.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma tarefa encontrada</Text>
            </View>
        );
    }

    return (
        <SectionList
            sections={sections as SectionListData<Task, SectionData>[]}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            onScrollBeginDrag={(e) => {
                // expande para cima quando o usuario arrasta perto do topo
                if (e.nativeEvent.contentOffset.y < 100) onStartReached();
            }}
            onViewableItemsChanged={handleViewableChange}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            ListFooterComponent={
                loadingMore
                    ? <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />
                    : null
            }
            renderSectionHeader={({ section: { dateStr, title } }: { section: SectionData }) => (
                <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                    <Text style={[
                        styles.sectionTitle,
                        { color: isToday(new Date(dateStr + 'T00:00:00')) ? colors.primary : colors.text },
                    ]}>
                        {title}
                    </Text>
                    <View style={[styles.sectionLine, { backgroundColor: colors.divider }]} />
                </View>
            )}
            renderSectionFooter={() => <View style={{ height: 16 }} />}
            renderItem={({ item }) => <TaskCard task={item} showTime />}
        />
    );
}

// ── enhance — usa Q.gte + Q.lte pois deadline_date é string ──────────────────

const EnhancedPlannerList = withObservables(
    ['startDate', 'endDate'],
    () => ({
        tasks: database.get<Task>('tasks')
            .query()
            .observe(),
    })
)(PlannerList as any);

// ── container — gerencia a janela de datas ────────────────────────────────────

export default function PlannerView({ onVisibleDateChange }: OuterProps) {
    const today = new Date();
    const [startOffset, setStartOffset] = useState(30);
    const [endOffset, setEndOffset] = useState(PAGE_SIZE);
    const [loadingMore, setLoadingMore] = useState(false);

    const handleEndReached = useCallback(() => {
        if (loadingMore) return;
        setLoadingMore(true);
        setEndOffset(prev => prev + PAGE_SIZE);
        setLoadingMore(false);
    }, [loadingMore]);

    const handleStartReached = useCallback(() => {
        setStartOffset(prev => prev + PAGE_SIZE);
    }, []);

    const startDate = toDateString(addDays(today, -startOffset));
    const endDate = toDateString(addDays(today, endOffset));

    return (
        <EnhancedPlannerList
            startDate={startDate}
            endDate={endDate}
            onVisibleDateChange={onVisibleDateChange}
            onEndReached={handleEndReached}
            onStartReached={handleStartReached}
            loadingMore={loadingMore}
            startOffset={startOffset}
            endOffset={endOffset}
        />
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
    sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 14 },
});
