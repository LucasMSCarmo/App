import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskPriority } from '@/src/constants/taskConstants';

interface PriorityOptions {
    value: TaskPriority;
    labelKey: string;
    colorKey: 'priorityLow' | 'priorityMedium' | 'priorityHigh' | 'priorityNone';
    surfaceKey: 'successSurface' | 'warningSurface' | 'dangerSurface' | 'surfaceVariant';
}

const PRIORITY_OPTIONS: PriorityOptions[] = [
    { value: 'low', labelKey: 'Baixa', colorKey: 'priorityLow', surfaceKey: 'successSurface' },
    { value: 'medium', labelKey: 'Média', colorKey: 'priorityMedium', surfaceKey: 'warningSurface' },
    { value: 'high', labelKey: 'Alta', colorKey: 'priorityHigh', surfaceKey: 'dangerSurface' },
    { value: 'none', labelKey: 'Nenhuma', colorKey: 'priorityNone', surfaceKey: 'surfaceVariant' },
];

interface PriorityBadgeProps {
    priority: TaskPriority;
    colors: any;
}

function getPriorityConfig(priority: TaskPriority) {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[3];
}

const TaskPriorityBadge = ({ priority, colors }: PriorityBadgeProps) => {
    const config = getPriorityConfig(priority);
    const color = colors[config.colorKey];
    const bg = colors[config.surfaceKey];

    return (
        <View style={[styles.priorityBadge, { backgroundColor: bg }]}>
            <View style={[styles.priorityDot, { backgroundColor: color }]} />
            <Text style={[styles.priorityLabel, { color }]}>{config?.labelKey}</Text>
        </View>
    );
};

export default TaskPriorityBadge;

const styles = StyleSheet.create({
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    priorityLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});