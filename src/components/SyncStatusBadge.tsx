import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { QueuedSyncAction, subscribeSyncQueue } from '@/src/database/syncQueue';

export function SyncStatusBadge() {
  const { colors } = useTheme();
  const [queue, setQueue] = useState<QueuedSyncAction[]>([]);

  useEffect(() => subscribeSyncQueue(setQueue), []);

  const pendingCount = queue.length;
  const firstError = queue.find((action) => action.lastError)?.lastError;
  const isSynced = pendingCount === 0;

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: isSynced ? colors.successSurface : colors.warningSurface,
        borderColor: isSynced ? colors.success : colors.warning,
      },
    ]}>
      <Ionicons
        name={isSynced ? 'cloud-done-outline' : 'cloud-upload-outline'}
        size={14}
        color={isSynced ? colors.success : colors.warning}
      />
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: isSynced ? colors.success : colors.warning }]}>
          {isSynced ? 'Tudo sincronizado' : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
        </Text>
        {!!firstError && (
          <Text style={[styles.error, { color: colors.textMuted }]} numberOfLines={1}>
            {firstError}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 34,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: 190,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    fontSize: 10,
    marginTop: 1,
  },
});
