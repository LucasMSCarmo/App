import AsyncStorage from '@react-native-async-storage/async-storage';
import { Model } from '@nozbe/watermelondb';

const TOMBSTONES_KEY = '@sync_tombstones';

export type SyncTombstone = {
  table: string;
  id: string;
  serverId?: string;
  taskId?: string;
  taskServerId?: string;
  categoryId?: string;
  categoryServerId?: string;
  userId?: string;
  createdBy?: string;
  deletedAt: number;
};

export function nowForSync() {
  return Date.now();
}

export function touchForSync<T extends Model>(record: T, timestamp = nowForSync()) {
  const raw = (record as any)._raw;
  if ('updated_at' in raw) {
    raw.updated_at = timestamp;
  }
}

export function markDeletedForSync<T extends Model>(record: T, timestamp = nowForSync()) {
  const raw = (record as any)._raw;
  if ('deleted_at' in raw) {
    raw.deleted_at = timestamp;
  }
  if ('updated_at' in raw) {
    raw.updated_at = timestamp;
  }
}

async function readTombstones(): Promise<SyncTombstone[]> {
  const raw = await AsyncStorage.getItem(TOMBSTONES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addSyncTombstone(tombstone: SyncTombstone) {
  const tombstones = await readTombstones();
  const key = [
    tombstone.table,
    tombstone.serverId || tombstone.id,
    tombstone.taskServerId || tombstone.taskId || '',
    tombstone.categoryServerId || tombstone.categoryId || '',
    tombstone.userId || '',
  ].join(':');

  const filtered = tombstones.filter((item) => [
    item.table,
    item.serverId || item.id,
    item.taskServerId || item.taskId || '',
    item.categoryServerId || item.categoryId || '',
    item.userId || '',
  ].join(':') !== key);

  await AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify([...filtered, tombstone]));
}

export async function getSyncTombstones() {
  return readTombstones();
}

export async function clearSyncTombstones() {
  await AsyncStorage.removeItem(TOMBSTONES_KEY);
}
