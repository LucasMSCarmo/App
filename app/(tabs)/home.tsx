import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '@/src/contexts/AuthContext';
import TaskItem from '@/src/components/TaskItem';
import { CreateTaskModal } from '@/src/components/CreateTaskModal';
import { useTheme } from '@/src/contexts/ThemeContext';

function Home({ tasks }: { tasks: Task[] }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    console.log("Iniciando sincronização...");
    setRefreshing(false);
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    get percentage() {
      return this.total > 0 ? Math.round((this.completed / this.total) * 100) : 0;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>{user ? `Bom dia, ${user.name}! 👋` : 'Bom dia! 👋'}</Text>
          <Text style={[styles.tasksCount, { color: colors.textSecondary }]}>
            Você tem {stats.total} tarefas para hoje
          </Text>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Seu progresso</Text>
          {!stats.total && (
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>Nenhuma tarefa para hoje</Text>
          )}
          {stats.total > 0 && (
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>{stats.percentage}% concluído hoje</Text>
          )}

          <View style={[styles.progressBarContainer, stats.total > 0 ? { backgroundColor: '#2a2a2a' } : null]}>
            <View style={[styles.progressBar, { width: `${stats.percentage}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        <View style={styles.tasksSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tarefas</Text>

          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TaskItem task={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={() => (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                Nenhuma tarefa para hoje
              </Text>
            )}
          />
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <CreateTaskModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const enhance = withObservables([], () => {
  const now = new Date();

  const startOfUtcDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));

  const endOfUtcDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));
  return {
    tasks: database.get<Task>('tasks').query(
      Q.where('deadline', Q.between(startOfUtcDay.getTime(), endOfUtcDay.getTime()))
    ).observe(),
  };
});

export default enhance(Home);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tasksCount: {
    fontSize: 16,
    marginTop: 6,
  },

  progressCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressSubtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },

  tasksSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },

  taskCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
  },

  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtaskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtaskText: {
    fontSize: 12,
  },
  dueDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueDateText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});