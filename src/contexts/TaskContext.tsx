import React, { createContext, useContext, useState, useCallback } from 'react';
import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { api } from '@/src/libs/axios';

interface TaskContextData {
  isSyncing: boolean;
  lastSync: Date | null;
  sync: () => Promise<void>;
}

const TaskContext = createContext<TaskContextData>({} as TaskContextData);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const sync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          // O backend precisa dessa rota /sync que vamos criar no Prisma
          const response = await api.get(`/sync?lastPulledAt=${lastPulledAt || 0}`);
          
          if (response.status !== 200) {
            throw new Error('Erro ao buscar dados do servidor');
          }

          const { changes, timestamp } = response.data;
          return { changes, timestamp };
        },
        pushChanges: async ({ changes }) => {
          // Envia o que foi criado/editado offline para o Node.js
          await api.post('/sync', { changes });
        },
      });

      setLastSync(new Date());
      console.log('✅ Sincronização concluída com sucesso!');
    } catch (error) {
      console.error('❌ Falha na sincronização:', error);
      // Aqui, se o erro for 401 (Token expirado), você pode redirecionar para Login
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return (
    <TaskContext.Provider value={{ isSyncing, lastSync, sync }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => useContext(TaskContext);