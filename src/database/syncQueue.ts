import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { api } from '@/src/libs/axios';

const SYNC_QUEUE_KEY = '@sync_action_queue';

export type SyncActionType =
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'task.leave'
  | 'taskMember.add'
  | 'taskMember.remove'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'comment.create'
  | 'comment.update'
  | 'comment.delete'
  | 'subtask.create'
  | 'subtask.update'
  | 'subtask.delete';

export type QueuedSyncAction = {
  id: string;
  type: SyncActionType;
  payload: Record<string, any>;
  createdAt: string;
  attempts: number;
  lastError?: string;
  nextRetryAt?: number;
};

type QueueListener = (queue: QueuedSyncAction[]) => void;

const listeners = new Set<QueueListener>();
let isProcessing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

async function readQueue(): Promise<QueuedSyncAction[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedSyncAction[]) {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  listeners.forEach((listener) => listener(queue));
}

function scheduleRetry(queue: QueuedSyncAction[]) {
  if (retryTimer || queue.length === 0) return;
  const nextRetryAt = queue[0].nextRetryAt ?? Date.now() + 5000;
  const delay = Math.max(1000, nextRetryAt - Date.now());
  retryTimer = setTimeout(() => {
    retryTimer = null;
    processSyncQueue().catch(() => {});
  }, delay);
}

function getErrorMessage(error: any) {
  return error?.response?.data?.message || error?.message || 'Falha ao sincronizar';
}

export async function getSyncQueue() {
  return readQueue();
}

export async function getPendingSyncCount() {
  return (await readQueue()).length;
}

export async function clearSyncQueue() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  await writeQueue([]);
}

export function subscribeSyncQueue(listener: QueueListener) {
  listeners.add(listener);
  readQueue().then(listener).catch(() => listener([]));
  return () => {
    listeners.delete(listener);
  };
}

export async function enqueueSyncAction(
  type: SyncActionType,
  payload: Record<string, any>,
  id: string = Crypto.randomUUID(),
) {
  const queue = await readQueue();
  const action: QueuedSyncAction = {
    id,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await writeQueue([...queue, action]);
  processSyncQueue().catch(() => {});
  return action;
}

export async function processSyncQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    let queue = await readQueue();
    while (queue.length > 0) {
      const action = queue[0];
      if (action.nextRetryAt && action.nextRetryAt > Date.now()) {
        scheduleRetry(queue);
        break;
      }

      try {
        await api.post('/sync/action', {
          id: action.id,
          type: action.type,
          payload: action.payload,
          createdAt: action.createdAt,
        });
        queue = (await readQueue()).filter((queuedAction) => queuedAction.id !== action.id);
        await writeQueue(queue);
      } catch (error: any) {
        const attempts = action.attempts + 1;
        const delay = Math.min(60000, 2000 * 2 ** Math.min(attempts, 5));
        const latestQueue = await readQueue();
        queue = latestQueue.map((queuedAction) =>
          queuedAction.id === action.id
            ? {
            ...action,
            attempts,
            lastError: getErrorMessage(error),
            nextRetryAt: Date.now() + delay,
          }
            : queuedAction,
        );
        await writeQueue(queue);
        scheduleRetry(queue);
        throw error;
      }
    }
  } finally {
    isProcessing = false;
  }
}
