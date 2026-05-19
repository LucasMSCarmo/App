import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TaskStatus } from '@/src/constants/taskConstants';

interface StatusOption {
    value: TaskStatus;
    label: string;
    colorKey: 'statusPending' | 'statusInProgress' | 'statusDone' | 'statusCancelled';
    surfaceKey: 'warningSurface' | 'infoSurface' | 'successSurface' | 'dangerSurface';
}

const STATUS_OPTIONS: StatusOption[] = [
    { value: 'pending',     label: 'Pendente',      colorKey: 'statusPending',    surfaceKey: 'warningSurface' },
    { value: 'in_progress', label: 'Em andamento',  colorKey: 'statusInProgress', surfaceKey: 'infoSurface'    },
    { value: 'done',        label: 'Concluído',     colorKey: 'statusDone',       surfaceKey: 'successSurface' },
    { value: 'cancelled',   label: 'Cancelado',     colorKey: 'statusCancelled',  surfaceKey: 'dangerSurface'  },
];

interface StatusSelectorProps {
    status: TaskStatus;
    colors: any;
    onStatusChange: (status: TaskStatus) => void;
}

const TaskStatusSelector = ({ status, colors, onStatusChange }: StatusSelectorProps) => (
    <View>
        <Text style={[styles.label, { color: colors.textMuted }]}>Status</Text>
        <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
            {STATUS_OPTIONS.map((option) => {
                const isActive = status === option.value;
                const color = colors[option.colorKey];
                const surface = colors[option.surfaceKey];

                return (
                    <TouchableOpacity
                        key={option.value}
                        onPress={() => !isActive && onStatusChange(option.value)}
                        style={[
                            styles.option,
                            isActive && { backgroundColor: surface, borderColor: color + '40' },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`Status: ${option.label}`}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.dot, { backgroundColor: color, opacity: isActive ? 1 : 0.35 }]} />
                        <Text
                            style={[
                                styles.optionText,
                                { color: isActive ? color : colors.textMuted },
                                isActive && styles.optionTextActive,
                            ]}
                            numberOfLines={1}
                        >
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

export default TaskStatusSelector;

const styles = StyleSheet.create({
    label: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    track: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
        gap: 2,
    },
    option: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 4,
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: 'transparent',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    optionText: {
        fontSize: 12,
        fontWeight: '500',
    },
    optionTextActive: {
        fontWeight: '700',
    },
});