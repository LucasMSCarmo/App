import AsyncStorage from '@react-native-async-storage/async-storage';
import { Model, Q } from '@nozbe/watermelondb';
import * as Notifications from 'expo-notifications';
import { api } from '@/src/libs/axios';
import { database } from '@/src/database';
import Task from '@/src/database/model/Task';
import Category from '@/src/database/model/Category';
import TaskMember from '@/src/database/model/TaskMember';
import TaskCategory from '@/src/database/model/TaskCategory';
import Comment from '@/src/database/model/Comment';
import Media from '@/src/database/model/Media';
import Subtask from '@/src/database/model/Subtask';
import {
  clearSyncTombstones,
  getSyncTombstones,
  markDeletedForSync,
  touchForSync,
} from '@/src/utils/syncMetadata';
import { processSyncQueue } from '@/src/database/syncQueue';

export const SYNC_WIFI_ONLY_KEY = '@sync_wifi_only';
export const SYNC_LAST_SYNC_KEY = '@sync_last_sync_at';

type CollaborationNotification = {
  id: string;
  title: string;
  body: string;
  taskId: string;
  type: 'task_member_added' | 'task_comment';
};

const getCurrentUserId = async () => {
  const raw = await AsyncStorage.getItem('@user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
};

const normalizeRemoteMember = (member: any) => ({
  id: String(member?.id ?? member?.userId ?? member?.user?.id ?? ''),
  name: String(member?.name ?? member?.userName ?? member?.user?.name ?? 'Membro'),
});

const scheduleCollaborationNotifications = async (items: CollaborationNotification[]) => {
  if (items.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  for (const item of items) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: item.title,
        body: item.body,
        sound: true,
        data: { taskId: item.taskId, type: item.type },
      },
      trigger: null,
    });
  }
};

const toDateParts = (deadline?: string | null) => {
  if (!deadline) return { deadlineDate: undefined, deadlineTime: undefined };
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return { deadlineDate: undefined, deadlineTime: undefined };

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');

  return {
    deadlineDate: `${year}-${month}-${day}`,
    deadlineTime: `${hour}:${minute}`,
  };
};

const toDeadlineIso = (task: Task) => {
  if (!task.deadlineDate) return undefined;
  return new Date(`${task.deadlineDate}T${task.deadlineTime || '00:00'}:00`).toISOString();
};

const toSyncDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const toSyncMillis = (value: unknown) => toSyncDate(value)?.getTime() ?? 0;

const recordUpdatedAt = (record: any) =>
  toSyncDate(record.updatedAt)?.toISOString()
  ?? (typeof record.updatedAt === 'number' ? new Date(record.updatedAt).toISOString() : undefined)
  ?? (typeof record._raw?.updated_at === 'number' ? new Date(record._raw.updated_at).toISOString() : undefined);

const recordDeletedAt = (record: any) =>
  typeof record.deletedAt === 'number' && record.deletedAt > 0
    ? new Date(record.deletedAt).toISOString()
    : undefined;

const shouldApplyRemote = (local: any | null, remote: any) => {
  if (!local) return true;
  const localAction = Math.max(
    toSyncMillis(local.updatedAt),
    typeof local._raw?.updated_at === 'number' ? local._raw.updated_at : 0,
    typeof local.deletedAt === 'number' ? local.deletedAt : 0,
    typeof local._raw?.deleted_at === 'number' ? local._raw.deleted_at : 0,
  );
  const remoteAction = Math.max(toSyncMillis(remote.updatedAt), toSyncMillis(remote.deletedAt));
  return remoteAction >= localAction;
};

async function findByServerId<T extends Model>(table: string, serverId: string): Promise<T | null> {
  if (!serverId) return null;
  const rows = await database.get<T>(table).query(Q.where('server_id', Q.eq(serverId))).fetch();
  return rows[0] ?? null;
}

async function pushLocalChanges() {
  const [tasks, categories, taskCategories, taskMembers, comments, media, subtasks] = await Promise.all([
    database.get<Task>('tasks').query().fetch(),
    database.get<Category>('categories').query().fetch(),
    database.get<TaskCategory>('task_categories').query().fetch(),
    database.get<TaskMember>('task_members').query().fetch(),
    database.get<Comment>('comments').query().fetch(),
    database.get<Media>('media').query().fetch(),
    database.get<Subtask>('subtasks').query().fetch(),
  ]);
  const tombstones = await getSyncTombstones();

  await api.post('/sync/push', {
    tasks: tasks.map((task) => ({
      id: task.serverId || task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority || 'none',
      deadline: toDeadlineIso(task),
      deadlineDate: task.deadlineDate,
      deadlineTime: task.deadlineTime,
      recurrenceType: task.recurrenceType || 'none',
      recurrenceWeekdays: task.recurrenceWeekdays,
      latitude: task.latitude,
      longitude: task.longitude,
      address: task.address,
      createdAt: task.createdAt.toISOString(),
      updatedAt: recordUpdatedAt(task),
      deletedAt: recordDeletedAt(task),
    })),
    categories: categories.map((category) => ({
      id: category.serverId || category.id,
      name: category.name,
      color: category.color,
      updatedAt: recordUpdatedAt(category),
      deletedAt: recordDeletedAt(category),
    })),
    taskCategories: taskCategories.map((item) => ({
      taskId: tasks.find((task) => task.id === item.taskId)?.serverId || item.taskId,
      categoryId: categories.find((category) => category.id === item.categoryId)?.serverId || item.categoryId,
      updatedAt: recordUpdatedAt(item),
      deletedAt: recordDeletedAt(item),
    })),
    taskMembers: taskMembers.map((member) => ({
      taskId: tasks.find((task) => task.id === member.taskId)?.serverId || member.taskId,
      userId: member.userId,
      updatedAt: recordUpdatedAt(member),
      deletedAt: recordDeletedAt(member),
    })),
    comments: comments.map((comment) => ({
      id: comment.serverId || comment.id,
      taskId: tasks.find((task) => task.id === comment.taskId)?.serverId || comment.taskId,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: recordUpdatedAt(comment),
      deletedAt: recordDeletedAt(comment),
    })),
    media: media.map((item) => ({
      id: item.serverId || item.id,
      taskId: tasks.find((task) => task.id === item.taskId)?.serverId || item.taskId,
      name: item.name,
      url: item.url,
      mimeType: item.mime_type,
      type: item.type,
      size: item.size,
      updatedAt: recordUpdatedAt(item),
      deletedAt: recordDeletedAt(item),
    })),
    subtasks: subtasks.map((subtask) => ({
      id: subtask.serverId || subtask.id,
      taskId: tasks.find((task) => task.id === subtask.taskId)?.serverId || subtask.taskId,
      name: subtask.name,
      details: subtask.details,
      status: subtask.status,
      order: subtask.order,
      updatedAt: recordUpdatedAt(subtask),
      deletedAt: recordDeletedAt(subtask),
    })),
    tombstones,
  });
}

async function pullRemoteChanges(since?: string | null) {
  const { data } = await api.get('/sync/pull', {
    params: since ? { since } : undefined,
  });
  const remoteTasks = data?.tasks ?? [];
  const remoteCategories = data?.categories ?? [];
  const remoteComments = data?.comments ?? [];
  const removedTaskMemberships = data?.removedTaskMemberships ?? [];
  const currentUserId = since ? await getCurrentUserId() : null;
  const notifications: CollaborationNotification[] = [];

  await database.write(async () => {
    for (const remote of remoteCategories) {
      const existing = await findByServerId<Category>('categories', remote.id);
      if (!shouldApplyRemote(existing, remote)) continue;
      if (remote.deletedAt) {
        if (existing) {
          await existing.update((category) => markDeletedForSync(category, toSyncMillis(remote.deletedAt)));
          await existing.markAsDeleted();
        }
        continue;
      }
      if (existing) {
        await existing.update((category) => {
          category.name = remote.name;
          category.color = remote.color || category.color;
          touchForSync(category, toSyncMillis(remote.updatedAt));
        });
      } else {
        await database.get<Category>('categories').create((category) => {
          category.serverId = remote.id;
          category.name = remote.name;
          category.color = remote.color || '#3B82F6';
          category.createdBy = remote.createdBy;
          touchForSync(category, toSyncMillis(remote.updatedAt));
        });
      }
    }

    for (const remote of remoteTasks) {
      const existing = await findByServerId<Task>('tasks', remote.id);
      if (!shouldApplyRemote(existing, remote)) continue;
      if (remote.deletedAt) {
        if (existing) {
          await existing.update((task) => markDeletedForSync(task, toSyncMillis(remote.deletedAt)));
          await existing.markAsDeleted();
        }
        continue;
      }
      const parsedDeadline = toDateParts(remote.deadline);
      const deadlineDate = remote.deadlineDate ?? parsedDeadline.deadlineDate;
      const deadlineTime = remote.deadlineTime ?? parsedDeadline.deadlineTime;

      const applyTask = (task: Task) => {
        task.serverId = remote.id;
        task.title = remote.title;
        task.description = remote.description || '';
        const remoteStatus = remote.status || 'pending';
        const wasDone = task.status === 'done';
        task.status = remoteStatus;
        if (remoteStatus === 'done') {
          task.completedAt = toSyncMillis(remote.completedAt)
            || task.completedAt
            || toSyncMillis(remote.updatedAt)
            || Date.now();
        } else if (wasDone || task.completedAt) {
          task.completedAt = undefined;
        }
        task.priority = remote.priority || '';
        task.deadlineDate = deadlineDate;
        task.deadlineTime = deadlineTime;
        task.recurrenceType = remote.recurrenceType || 'none';
        task.recurrenceWeekdays = remote.recurrenceWeekdays || '';
        task.latitude = remote.latitude ?? undefined;
        task.longitude = remote.longitude ?? undefined;
        task.address = remote.address || '';
        task.createdBy = remote.createdBy;
        touchForSync(task, toSyncMillis(remote.updatedAt));
      };

      const localTask = existing ?? await database.get<Task>('tasks').create(applyTask);
      if (existing) await existing.update(applyTask);

      const currentMembers = await localTask.members.fetch();
      const currentMemberIds = new Set(currentMembers.map((member: TaskMember) => member.userId));
      for (const rawMember of remote.members ?? []) {
        const member = normalizeRemoteMember(rawMember);
        if (!member.id || currentMemberIds.has(member.id)) continue;
        await database.get<TaskMember>('task_members').create((record) => {
          record.taskId = localTask.id;
          record.userId = member.id;
          record.userName = member.name;
          touchForSync(record, toSyncMillis(remote.updatedAt));
        });
        currentMemberIds.add(member.id);

        if (currentUserId && member.id === currentUserId && String(remote.createdBy ?? '') !== currentUserId) {
          notifications.push({
            id: `${localTask.id}-member-added-${toSyncMillis(remote.updatedAt) || Date.now()}`,
            title: 'Você foi adicionada a uma tarefa',
            body: remote.title ? `Tarefa: ${remote.title}` : 'Abra o app para ver os detalhes.',
            taskId: localTask.id,
            type: 'task_member_added',
          });
        }
      }
      for (const member of remote.taskMembers ?? []) {
        if (!member.deletedAt) continue;
        const localMember = currentMembers.find((record: TaskMember) => record.userId === member.userId);
        if (!localMember || !shouldApplyRemote(localMember, member)) continue;
        await localMember.update((record: TaskMember) => markDeletedForSync(record, toSyncMillis(member.deletedAt)));
        await localMember.markAsDeleted();
      }

      const currentCategories = await localTask.categories.fetch();
      const currentCategoryIds = new Set(currentCategories.map((category: Category) => category.serverId || category.id));
      for (const category of remote.categories ?? []) {
        if (currentCategoryIds.has(category.id)) continue;
        const localCategory = await findByServerId<Category>('categories', category.id);
        if (!localCategory) continue;
        await database.get<TaskCategory>('task_categories').create((record) => {
          record.taskId = localTask.id;
          record.categoryId = localCategory.id;
          touchForSync(record, toSyncMillis(remote.updatedAt));
        });
      }
      const currentTaskCategories = await database.get<TaskCategory>('task_categories')
        .query(Q.where('task_id', localTask.id))
        .fetch();
      for (const relation of remote.taskCategories ?? []) {
        if (!relation.deletedAt) continue;
        const localCategory = await findByServerId<Category>('categories', relation.categoryId);
        if (!localCategory) continue;
        const localRelation = currentTaskCategories.find((record) => record.categoryId === localCategory.id);
        if (!localRelation || !shouldApplyRemote(localRelation, relation)) continue;
        await localRelation.update((record) => markDeletedForSync(record, toSyncMillis(relation.deletedAt)));
        await localRelation.markAsDeleted();
      }

      for (const remoteMedia of remote.media ?? []) {
        const existingMedia = await findByServerId<Media>('media', remoteMedia.id);
        if (!shouldApplyRemote(existingMedia, remoteMedia)) continue;
        if (remoteMedia.deletedAt) {
          if (existingMedia) {
            await existingMedia.update((item) => markDeletedForSync(item, toSyncMillis(remoteMedia.deletedAt)));
            await existingMedia.markAsDeleted();
          }
          continue;
        }
        if (existingMedia) {
          await existingMedia.update((item) => {
            item.name = remoteMedia.name;
            item.url = remoteMedia.url;
            item.mime_type = remoteMedia.mimeType;
            item.type = remoteMedia.type;
            item.size = remoteMedia.size ?? undefined;
            touchForSync(item, toSyncMillis(remoteMedia.updatedAt));
          });
        } else {
          await database.get<Media>('media').create((item) => {
            item.serverId = remoteMedia.id;
            item.taskId = localTask.id;
            item.name = remoteMedia.name;
            item.url = remoteMedia.url;
            item.mime_type = remoteMedia.mimeType;
            item.type = remoteMedia.type;
            item.size = remoteMedia.size ?? undefined;
            touchForSync(item, toSyncMillis(remoteMedia.updatedAt));
          });
        }
      }

      for (const remoteSubtask of remote.subtasks ?? []) {
        const existingSubtask = await findByServerId<Subtask>('subtasks', remoteSubtask.id);
        if (!shouldApplyRemote(existingSubtask, remoteSubtask)) continue;
        if (remoteSubtask.deletedAt) {
          if (existingSubtask) {
            await existingSubtask.update((subtask) => markDeletedForSync(subtask, toSyncMillis(remoteSubtask.deletedAt)));
            await existingSubtask.markAsDeleted();
          }
          continue;
        }
        if (existingSubtask) {
          await existingSubtask.update((subtask) => {
            subtask.name = remoteSubtask.name;
            subtask.details = remoteSubtask.details || '';
            subtask.status = !!remoteSubtask.status;
            subtask.order = remoteSubtask.order ?? 0;
            touchForSync(subtask, toSyncMillis(remoteSubtask.updatedAt));
          });
        } else {
          await database.get<Subtask>('subtasks').create((subtask) => {
            subtask.serverId = remoteSubtask.id;
            subtask.taskId = localTask.id;
            subtask.name = remoteSubtask.name;
            subtask.details = remoteSubtask.details || '';
            subtask.status = !!remoteSubtask.status;
            subtask.order = remoteSubtask.order ?? 0;
            touchForSync(subtask, toSyncMillis(remoteSubtask.updatedAt));
          });
        }
      }
    }

    for (const remote of remoteComments) {
      const existing = await findByServerId<Comment>('comments', remote.id);
      const localTask = await findByServerId<Task>('tasks', remote.taskId);
      if (!localTask) continue;
      if (!shouldApplyRemote(existing, remote)) continue;
      if (remote.deletedAt) {
        if (existing) {
          await existing.update((comment) => markDeletedForSync(comment, toSyncMillis(remote.deletedAt)));
          await existing.markAsDeleted();
        }
        continue;
      }

      if (existing) {
        await existing.update((comment) => {
          comment.body = remote.body;
          comment.userName = remote.user?.name || comment.userName;
          touchForSync(comment, toSyncMillis(remote.updatedAt));
        });
      } else {
        await database.get<Comment>('comments').create((comment) => {
          comment.serverId = remote.id;
          comment.taskId = localTask.id;
          comment.userId = String(remote.userId);
          comment.userName = remote.user?.name || 'Membro';
          comment.body = remote.body;
          touchForSync(comment, toSyncMillis(remote.updatedAt));
        });

        if (currentUserId && String(remote.userId) !== currentUserId) {
          const taskMembers = await localTask.members.fetch();
          const isParticipant = localTask.createdBy === currentUserId
            || taskMembers.some((member: TaskMember) => member.userId === currentUserId);

          if (isParticipant) {
            notifications.push({
              id: `${localTask.id}-comment-${remote.id}`,
              title: 'Novo comentário em uma tarefa',
              body: `${remote.user?.name || 'Membro'} comentou em "${localTask.title}".`,
              taskId: localTask.id,
              type: 'task_comment',
            });
          }
        }
      }
    }

    for (const membership of removedTaskMemberships) {
      const localTask = await findByServerId<Task>('tasks', membership.taskId);
      if (!localTask || !shouldApplyRemote(localTask, membership)) continue;
      await localTask.update((task) => markDeletedForSync(task, toSyncMillis(membership.deletedAt)));
      await localTask.markAsDeleted();
    }
  });

  await scheduleCollaborationNotifications(notifications);
}

export async function syncNow() {
  await processSyncQueue();
  const lastSyncAt = await AsyncStorage.getItem(SYNC_LAST_SYNC_KEY);
  await pullRemoteChanges(lastSyncAt);
  await clearSyncTombstones();
  await AsyncStorage.setItem(SYNC_LAST_SYNC_KEY, new Date().toISOString());
}

export async function shouldAutoSync() {
  const wifiOnly = await AsyncStorage.getItem(SYNC_WIFI_ONLY_KEY);
  return wifiOnly !== 'true';
}
