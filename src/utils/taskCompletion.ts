import Task from '@/src/database/model/Task';
import { TaskStatus } from '@/src/constants/taskConstants';

export function applyTaskStatus(
    task: Task,
    nextStatus: TaskStatus,
    completionTime = Date.now(),
) {
    const wasDone = task.status === 'done';
    const previousUpdate = task.updatedAt instanceof Date
        ? task.updatedAt.getTime()
        : new Date(task.updatedAt as any).getTime();

    task.status = nextStatus;

    if (nextStatus === 'done') {
        if (!wasDone) {
            task.completedAt = completionTime;
        } else if (!task.completedAt) {
            task.completedAt = Number.isFinite(previousUpdate) && previousUpdate > 0
                ? previousUpdate
                : completionTime;
        }
        return;
    }

    if (wasDone || task.completedAt) {
        task.completedAt = undefined;
    }
}
