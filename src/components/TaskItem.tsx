import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import Task from '@/src/database/model/Task';
import { TASK_PRIORITIES, TASK_STATUS } from '@/src/constants/taskConstants';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Props {
  task: Task;
  membersCount: number;
  subtasksCount: number;
  completedCount: number;
}

const TaskCard = ({ task, membersCount, subtasksCount, completedCount }: Props) => {
  const router = useRouter();
  const { colors } = useTheme();

  const priorityConfig = TASK_PRIORITIES[task.priority as keyof typeof TASK_PRIORITIES];

  return (
    <TouchableOpacity 
      style={[styles.taskCard, { backgroundColor: colors.surface, borderLeftColor: priorityConfig?.color }]}
      onPress={() => router.push(`/task/${task.id}`)}
    >
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, { color: colors.text }]}>
          {task.title}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityConfig?.color + '20' }]}>
          <Text style={[styles.priorityText, { color: priorityConfig?.color }]}>
            {task.priority?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.taskFooter}>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {membersCount} membros
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-done-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {completedCount}/{subtasksCount} subs
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TaskItem = withObservables(['task'], ({ task }: { task: Task }) => ({
  task: task.observe(),
  membersCount: task.members.observeCount(),
  subtasksCount: task.subtasks.observeCount(),
  completedCount: task.subtasks.extend(Q.where('status', Q.eq(true))).observeCount(),
}))(TaskCard);

export default TaskItem;

const styles = StyleSheet.create({
  taskCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
  },
});