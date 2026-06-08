import React from 'react';
import { Text, StyleSheet } from 'react-native';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import Task from '@/src/database/model/Task';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Props {
    task: Task;
}

function TaskProgressInfoBase({ completed, total }: { completed: number; total: number }) {
    const { colors } = useTheme();
    if (total === 0) return null;
    return (
        <Text style={[styles.text, { color: colors.textSecondary }]}>
            {completed}/{total} subtarefa{total !== 1 ? 's' : ''}
        </Text>
    );
}

const TaskProgressInfo = withObservables(['task'], ({ task }: Props) => ({
    completed: task.subtasks.extend(Q.where('status', true)).observeCount(),
    total: task.subtasks.observeCount(),
}))(TaskProgressInfoBase);

export default TaskProgressInfo;

const styles = StyleSheet.create({
    text: {
        fontSize: 12,
        marginTop: 2,
    },
});