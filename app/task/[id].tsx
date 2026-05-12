import { useLocalSearchParams } from 'expo-router';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import withObservables from '@nozbe/with-observables';
import TaskDetails from '@/src/components/TaskDetails';

export default function TaskPage() {
  const { id } = useLocalSearchParams();

  if (!id || typeof id !== 'string') return null;

  return <TaskDetailWithData id={id} />;
}

const TaskDetailWithData = withObservables(['id'], ({ id }: { id: string }) => ({
  task: database.get<Task>('tasks').findAndObserve(id),
}))(TaskDetails);