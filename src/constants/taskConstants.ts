// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'none';
export type ValidTaskPriority = Exclude<TaskPriority, 'none'> | '';
export type TaskStatus   = 'pending' | 'in_progress' | 'done' | 'cancelled';

// ─── Priority ─────────────────────────────────────────────────────────────────

export const TASK_PRIORITIES: Record<TaskPriority, {
    value:      TaskPriority;
    label:      string;
    colorKey:   'priorityLow' | 'priorityMedium' | 'priorityHigh' | 'priorityNone';
    surfaceKey: 'successSurface' | 'warningSurface' | 'dangerSurface' | 'surfaceVariant';
}> = {
    low:    { value: 'low',    label: 'Baixa',   colorKey: 'priorityLow',    surfaceKey: 'successSurface'  },
    medium: { value: 'medium', label: 'Média',   colorKey: 'priorityMedium', surfaceKey: 'warningSurface'  },
    high:   { value: 'high',   label: 'Alta',    colorKey: 'priorityHigh',   surfaceKey: 'dangerSurface'   },
    none:   { value: 'none',   label: 'Nenhuma', colorKey: 'priorityNone',   surfaceKey: 'surfaceVariant'  },
} as const;

export const {none: _, ...VALID_TASK_PRIORITIES} = TASK_PRIORITIES;

// ─── Status ───────────────────────────────────────────────────────────────────

export const TASK_STATUS: Record<TaskStatus, {
    value:      TaskStatus;
    label:      string;
    colorKey:   'statusPending' | 'statusInProgress' | 'statusDone' | 'statusCancelled';
    surfaceKey: 'warningSurface' | 'infoSurface' | 'successSurface' | 'dangerSurface';
}> = {
    pending:     { value: 'pending',     label: 'Pendente',     colorKey: 'statusPending',    surfaceKey: 'warningSurface' },
    in_progress: { value: 'in_progress', label: 'Em andamento', colorKey: 'statusInProgress', surfaceKey: 'infoSurface'    },
    done:        { value: 'done',        label: 'Concluído',    colorKey: 'statusDone',       surfaceKey: 'successSurface' },
    cancelled:   { value: 'cancelled',   label: 'Cancelado',    colorKey: 'statusCancelled',  surfaceKey: 'dangerSurface'  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getPriorityDetails = (priority: string) =>
    TASK_PRIORITIES[priority as TaskPriority] ?? TASK_PRIORITIES.none;

export const getStatusDetails = (status: string) =>
    TASK_STATUS[status as TaskStatus] ?? TASK_STATUS.pending;