import { Q } from '@nozbe/watermelondb';
import * as Crypto from 'expo-crypto';
import { database } from '@/src/database';
import Category from '@/src/database/model/Category';
import Task from '@/src/database/model/Task';
import TaskCategory from '@/src/database/model/TaskCategory';
import TaskMember from '@/src/database/model/TaskMember';
import { addSyncTombstone, markDeletedForSync, nowForSync, touchForSync } from '@/src/utils/syncMetadata';

export type SelectableMember = {
  userId: string;
  userName: string;
};

export const CATEGORY_COLORS = [
  '#6C63FF',
  '#2196F3',
  '#4CAF50',
  '#FF9800',
  '#FF4D4D',
  '#8E44AD',
  '#00A896',
  '#607D8B',
];

export async function createCategory(name: string, color: string, userId: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  return database.write(async () => database.get<Category>('categories').create((category) => {
    category.serverId = Crypto.randomUUID();
    category.name = trimmed;
    category.color = color;
    category.createdBy = userId;
    touchForSync(category);
  }));
}

export function getUniqueMembers(members: TaskMember[], currentUserId?: string): SelectableMember[] {
  const unique = new Map<string, SelectableMember>();

  members.forEach((member) => {
    if (!member.userId || member.userId === currentUserId) return;
    unique.set(member.userId, {
      userId: member.userId,
      userName: member.userName,
    });
  });

  return Array.from(unique.values()).sort((a, b) => a.userName.localeCompare(b.userName));
}

export async function replaceTaskCategories(task: Task, selectedCategoryIds: string[]) {
  const current = await task.collections
    .get<TaskCategory>('task_categories')
    .query(Q.where('task_id', task.id))
    .fetch();

  const nextIds = new Set(selectedCategoryIds);
  const currentIds = new Set(current.map((item) => item.categoryId));

  for (const item of current.filter((record) => !nextIds.has(record.categoryId))) {
    const deletedAt = nowForSync();
    const category = await database.get<Category>('categories').find(item.categoryId);
    await addSyncTombstone({
      table: 'task_categories',
      id: item.id,
      taskId: task.id,
      taskServerId: task.serverId,
      categoryId: item.categoryId,
      categoryServerId: category.serverId,
      deletedAt,
    });
    await item.update((record) => markDeletedForSync(record, deletedAt));
    await item.markAsDeleted();
  }

  for (const categoryId of selectedCategoryIds) {
    if (currentIds.has(categoryId)) continue;
    await task.collections.get<TaskCategory>('task_categories').create((item) => {
      item.taskId = task.id;
      item.categoryId = categoryId;
      touchForSync(item);
    });
  }
}

export async function replaceTaskMembers(
  task: Task,
  selectedMembers: SelectableMember[],
  creator: SelectableMember,
) {
  const current = await task.collections
    .get<TaskMember>('task_members')
    .query(Q.where('task_id', task.id))
    .fetch();

  const selected = new Map<string, SelectableMember>();
  selected.set(creator.userId, creator);
  selectedMembers.forEach((member) => {
    if (member.userId) selected.set(member.userId, member);
  });

  const selectedIds = new Set(selected.keys());
  const currentIds = new Set(current.map((member) => member.userId));

  for (const member of current.filter((record) => record.userId !== creator.userId && !selectedIds.has(record.userId))) {
    const deletedAt = nowForSync();
    await addSyncTombstone({
      table: 'task_members',
      id: member.id,
      taskId: task.id,
      taskServerId: task.serverId,
      userId: member.userId,
      deletedAt,
    });
    await member.update((record) => markDeletedForSync(record, deletedAt));
    await member.markAsDeleted();
  }

  for (const member of selected.values()) {
    if (currentIds.has(member.userId)) continue;
    await task.collections.get<TaskMember>('task_members').create((record) => {
      record.taskId = task.id;
      record.userId = member.userId;
      record.userName = member.userName;
      touchForSync(record);
    });
  }
}
