import { addDays, differenceInCalendarDays, format, isBefore } from 'date-fns';
import Task from '@/src/database/model/Task';
import { parseDateString, toDateString } from './dateHelpers';

export type TaskRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';

export const RECURRENCE_OPTIONS: { value: TaskRecurrenceType; label: string }[] = [
  { value: 'none', label: 'Sem recorrência' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekdays', label: 'Dias da semana' },
];

export const WEEKDAY_OPTIONS = [
  { value: 0, shortLabel: 'Dom', label: 'Domingo' },
  { value: 1, shortLabel: 'Seg', label: 'Segunda' },
  { value: 2, shortLabel: 'Ter', label: 'Terça' },
  { value: 3, shortLabel: 'Qua', label: 'Quarta' },
  { value: 4, shortLabel: 'Qui', label: 'Quinta' },
  { value: 5, shortLabel: 'Sex', label: 'Sexta' },
  { value: 6, shortLabel: 'Sáb', label: 'Sábado' },
];

export function encodeWeekdays(days: number[]): string {
  return [...new Set(days)]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b)
    .join(',');
}

export function parseWeekdays(value?: string | null): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => Number(item))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function getRecurrenceLabel(type?: string | null, weekdays?: string | null): string | null {
  if (!type || type === 'none') return null;
  if (type === 'daily') return 'Diário';
  if (type === 'weekly') return 'Semanal';
  if (type === 'monthly') return 'Mensal';
  if (type === 'weekdays') {
    const selected = parseWeekdays(weekdays);
    if (selected.length === 0) return 'Dias da semana';
    return selected
      .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.shortLabel)
      .filter(Boolean)
      .join(', ');
  }
  return null;
}

export function taskOccursOnDate(task: Task, dateStr: string): boolean {
  const recurrenceType = (task.recurrenceType || 'none') as TaskRecurrenceType;

  if (recurrenceType === 'none') {
    return task.deadlineDate === dateStr;
  }

  if (!task.deadlineDate) return false;

  const start = parseDateString(task.deadlineDate);
  const target = parseDateString(dateStr);

  if (isBefore(target, start)) return false;

  if (recurrenceType === 'daily') return true;

  if (recurrenceType === 'weekly') {
    return differenceInCalendarDays(target, start) % 7 === 0;
  }

  if (recurrenceType === 'monthly') {
    return target.getDate() === start.getDate();
  }

  if (recurrenceType === 'weekdays') {
    return parseWeekdays(task.recurrenceWeekdays).includes(target.getDay());
  }

  return false;
}

export function getTasksForDate(tasks: Task[], dateStr: string): Task[] {
  return tasks
    .filter((task) => taskOccursOnDate(task, dateStr))
    .sort((a, b) => {
      const timeA = a.deadlineTime || '00:00';
      const timeB = b.deadlineTime || '00:00';
      return timeA.localeCompare(timeB);
    });
}

export function getOccurrenceDatesInRange(tasks: Task[], startStr: string, endStr: string): string[] {
  const result = new Set<string>();
  const start = parseDateString(startStr);
  const end = parseDateString(endStr);

  for (let cursor = start; !isBefore(end, cursor); cursor = addDays(cursor, 1)) {
    const dateStr = toDateString(cursor);
    if (tasks.some((task) => taskOccursOnDate(task, dateStr))) {
      result.add(dateStr);
    }
  }

  return Array.from(result);
}

export function normalizeRecurrenceStartDate(date: Date | null, recurrenceType: TaskRecurrenceType): Date | null {
  if (date) return date;
  return recurrenceType === 'none' ? null : new Date();
}

export function getRecurrenceAnchorLabel(date: Date | null): string {
  return date ? format(date, 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
}
