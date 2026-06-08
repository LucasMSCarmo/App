import Task from '@/src/database/model/Task';
import Category from '@/src/database/model/Category';
import Subtask from '@/src/database/model/Subtask';
import Comment from '@/src/database/model/Comment';

export function toServerId(record: { serverId?: string; id: string }) {
  return record.serverId || record.id;
}

export function toIso(value?: Date | number | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function taskPayload(task: Task) {
  const deadline = task.deadlineDate
    ? new Date(`${task.deadlineDate}T${task.deadlineTime || '00:00'}:00`).toISOString()
    : undefined;

  return {
    id: toServerId(task),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority || 'none',
    deadline,
    deadlineDate: task.deadlineDate,
    deadlineTime: task.deadlineTime,
    recurrenceType: task.recurrenceType || 'none',
    recurrenceWeekdays: task.recurrenceWeekdays,
    latitude: task.latitude,
    longitude: task.longitude,
    address: task.address,
    createdBy: task.createdBy,
    createdAt: task.createdAt?.toISOString(),
    updatedAt: toIso((task as any)._raw?.updated_at) ?? new Date().toISOString(),
    deletedAt: toIso((task as any)._raw?.deleted_at),
  };
}

export function categoryPayload(category: Category) {
  return {
    id: toServerId(category),
    name: category.name,
    color: category.color,
    createdBy: category.createdBy,
    updatedAt: toIso((category as any)._raw?.updated_at) ?? new Date().toISOString(),
    deletedAt: toIso((category as any)._raw?.deleted_at),
  };
}

export function subtaskPayload(subtask: Subtask, task?: Task) {
  return {
    id: toServerId(subtask),
    taskId: task ? toServerId(task) : subtask.taskId,
    name: subtask.name,
    details: subtask.details,
    status: subtask.status,
    order: subtask.order,
    updatedAt: toIso((subtask as any)._raw?.updated_at) ?? new Date().toISOString(),
    deletedAt: toIso((subtask as any)._raw?.deleted_at),
  };
}

export function commentPayload(comment: Comment, task?: Task) {
  return {
    id: toServerId(comment),
    taskId: task ? toServerId(task) : comment.taskId,
    userId: comment.userId,
    userName: comment.userName,
    body: comment.body,
    createdAt: comment.createdAt?.toISOString(),
    updatedAt: toIso((comment as any)._raw?.updated_at) ?? new Date().toISOString(),
    deletedAt: toIso((comment as any)._raw?.deleted_at),
  };
}
