import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TODAY = format(new Date(), 'yyyy-MM-dd');
export const TODAY_DAY = new Date().getDate();

/** "2026-06-06" -> Date */
export function parseDateString(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Date -> "2026-06-06" */
export function toDateString(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/** "2026-06-06" -> "JUN. 2026" */
export function formatMonthYear(dateStr: string): string {
    const [year, month] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, 1), "MMM. yyyy", { locale: ptBR }).toUpperCase();
}

/** "2026-06-06" -> { day: "6", weekday: "SÁB." } */
export function formatDayLabel(dateStr: string): { day: string; weekday: string } {
    const date = parseDateString(dateStr);
    return {
        day: format(date, 'd', { locale: ptBR }),
        weekday: format(date, 'EEE.', { locale: ptBR }).toUpperCase(),
    };
}

/** Retorna "YYYY-MM-01" a partir de year e month number */
export function toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

// ── formatadores de label do header ──────────────────────────────────────────

const THIS_YEAR = new Date().getFullYear();

/** "JUN." ou "JUN. 2025" se ano diferente do atual */
export function headerMonth(dateStr: string): string {
    const [year, month] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    const mon = format(d, 'MMM.', { locale: ptBR }).toUpperCase();
    return year !== THIS_YEAR ? `${mon} ${year}` : mon;
}

/** "6 de jun." ou "6 de jun. 2025" */
export function headerDay(dateStr: string): string {
    const date = parseDateString(dateStr);
    const year = date.getFullYear();
    const base = format(date, "d 'de' MMM.", { locale: ptBR });
    return year !== THIS_YEAR ? `${base} ${year}` : base;
}

/**
 * Label de semana: "jun." ou "jun.–jul." se atravessa dois meses.
 * Adiciona ano se diferente do atual.
 */
export function headerWeek(weekStartStr: string): string {
    const start = parseDateString(weekStartStr);
    const end = addDays(start, 6);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMon = format(start, 'MMM.', { locale: ptBR }).toUpperCase();
    const endMon = format(end, 'MMM.', { locale: ptBR }).toUpperCase();

    if (startMon === endMon) {
        return startYear !== THIS_YEAR ? `${startMon} ${startYear}` : startMon;
    }
    // atravessa dois meses
    const suffix = endYear !== THIS_YEAR ? ` ${endYear}` : '';
    return `${startMon}–${endMon}${suffix}`;
}

/** "2026" */
export function headerYear(year: number): string {
    return String(year);
}

/** "jun. 2026" */
export function headerPlanner(dateStr: string): string {
    try {
        const date = parseDateString(dateStr);
        if (isNaN(date.getTime())) throw new Error();
        return format(date, "MMM. yyyy", { locale: ptBR });
    } catch {
        return format(new Date(), "MMM. yyyy", { locale: ptBR });
    }
}

/** Retorna o domingo da semana do dateStr como "yyyy-MM-dd" */
export function startOfWeekStr(dateStr: string): string {
    const date = parseDateString(dateStr);
    const start = startOfWeek(date, { weekStartsOn: 0 });
    return toDateString(start);
}