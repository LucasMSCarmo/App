import { TaskPriority } from '../enum/task-priority.type';
import { TaskStatus } from '../enum/task-status.type';
import { Category } from './category.type';
import { Subtask } from './subtask.type';

export interface Task {
    id: string;
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    createdBy: string;
    
    subtasks?: Subtask[];
    category?: Category[];
}
