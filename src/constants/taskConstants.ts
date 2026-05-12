export const TASK_PRIORITIES = {
  low: { value: 'low', label: 'Baixa', color: '#22c55e' },
  medium: { value: 'medium', label: 'Média', color: '#f59e0b' },
  high: { value: 'high', label: 'Alta', color: '#ef4444' },
} as const;

export const TASK_STATUS = {
  pending: { value: 'pending', label: 'Pendente' },
  in_progress: { value: 'in_progress', label: 'Em Progresso' },
  completed: { value: 'completed', label: 'Concluído' },
} as const;

// Helper para pegar a cor ou o label rapidamente
export const getPriorityDetails = (priority: string) => {
  return Object.values(TASK_PRIORITIES).find(p => p.value === priority) || TASK_PRIORITIES.medium;
};

export const getStatusDetails = (status: string) => {
  return Object.values(TASK_STATUS).find(s => s.value === status) || TASK_STATUS.pending;
};