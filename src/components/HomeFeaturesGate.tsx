import { useAuth } from '@/src/contexts/AuthContext';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import { getTasksForDate } from '@/src/utils/taskRecurrence';
import { toDateString } from '@/src/utils/dateHelpers';
import { syncTodayTasksWidget } from '@/modules/home-features/src';
import { useEffect } from 'react';

export function HomeFeaturesGate() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      syncTodayTasksWidget([]).catch(() => undefined);
      return;
    }

    const subscription = database
      .get<Task>('tasks')
      .query()
      .observe()
      .subscribe((tasks) => {
        const todayTasks = getTasksForDate(tasks, toDateString(new Date()))
          .filter((task) => !task.deletedAt && task.status !== 'cancelled')
          .map((task) => ({
            id: task.id,
            title: task.title,
            time: task.deadlineTime || undefined,
            done: task.status === 'done',
          }));

        syncTodayTasksWidget(todayTasks).catch((error) => {
          console.warn('Não foi possível atualizar o widget:', error);
        });
      });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  return null;
}
