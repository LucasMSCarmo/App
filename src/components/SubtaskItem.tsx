import React, { useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import Subtask from '@/src/database/model/Subtask';
import { useTheme } from '@/src/contexts/ThemeContext';

function SubtaskItem({ subtask, drag, isActive }: { subtask: Subtask; drag: () => void; isActive: boolean }) {
    const { colors } = useTheme();
    const [expanded, setExpanded] = useState(false);

    const handleToggle = async () => {
        try {
            await subtask.database.write(async () => {
                await subtask.update((s: Subtask) => {
                    s.status = !s.status;
                });
            });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    return (
        <View style={[
            styles.container,
            { backgroundColor: isActive ? colors.surfaceVariant : colors.surface },
        ]}>
            <View style={styles.row}>
                <TouchableOpacity onPress={handleToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                        name={subtask.status ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={subtask.status ? colors.success : colors.textSecondary}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.nameContainer}
                    onPress={() => {
                        if (subtask.details) {
                            setExpanded(!expanded);
                        }
                    }}
                    onLongPress={drag}
                    delayLongPress={200}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={[
                        styles.name,
                        { color: colors.text },
                        subtask.status && styles.completedText
                    ]}>
                        {subtask.name}
                    </Text>
                    {subtask.details ? (
                        <Ionicons
                            name={expanded ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={colors.textSecondary}
                        />
                    ) : null}

                    <Ionicons name="reorder-three-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {expanded && subtask.details ? (
                <View style={[styles.detailsContainer, { borderTopColor: colors.surfaceVariant }]}>
                    <Text style={[styles.details, { color: colors.textSecondary }]}>
                        {subtask.details}
                    </Text>
                </View>
            ) : null}
        </View >
    );
}

const enhance = withObservables(['subtask'], ({ subtask }: { subtask: Subtask }) => ({
    subtask: subtask.observe(),
}));

export default memo(enhance(SubtaskItem)) as any;

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 10,
    },
    nameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 16,
        flex: 1,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#888',
    },
    detailsContainer: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    details: {
        fontSize: 14,
        lineHeight: 20,
    },
});