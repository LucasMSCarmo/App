import { useRef, useState } from 'react';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { ValidTaskPriority } from '@/src/constants/taskConstants';
import { usePermissions } from '@/src/hooks/usePermitions';

interface ParsedTask {
    title?: string;
    description?: string;
    priority?: ValidTaskPriority;
    date?: Date;
    time?: Date;
}

function parsePriority(text: string): ValidTaskPriority {
    if (/prioridade alta|urgente|importante|alta prioridade/i.test(text)) return 'high';
    if (/prioridade média|prioridade media|média prioridade|media prioridade/i.test(text)) return 'medium';
    if (/prioridade baixa|baixa prioridade/i.test(text)) return 'low';
    return '';
}

function parseTime(text: string): Date | undefined {
    const match = text.match(/[àa]s\s+(\d{1,2})(?:[h:](\d{2}))?/i);
    if (!match) return undefined;
    const d = new Date();
    d.setHours(parseInt(match[1]), parseInt(match[2] ?? '0'), 0, 0);
    return d;
}

function parseDate(text: string, time?: Date): Date | undefined {
    const now = new Date();

    const make = (d: Date) => {
        if (time) d.setHours(time.getHours(), time.getMinutes(), 0, 0);
        else d.setHours(0, 0, 0, 0);
        return d;
    };

    if (/hoje/i.test(text)) return make(new Date(now));

    if (/amanhã|amanha/i.test(text)) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return make(d);
    }

    if (/depois de amanhã|depois de amanha/i.test(text)) {
        const d = new Date(now);
        d.setDate(d.getDate() + 2);
        return make(d);
    }

    if (/semana que vem|próxima semana|proxima semana/i.test(text)) {
        const d = new Date(now);
        d.setDate(d.getDate() + (8 - d.getDay()));
        return make(d);
    }

    const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    for (let i = 0; i < weekdays.length; i++) {
        if (new RegExp(weekdays[i], 'i').test(text)) {
            const d = new Date(now);
            const diff = (i - d.getDay() + 7) % 7 || 7;
            d.setDate(d.getDate() + diff);
            return make(d);
        }
    }

    const dayMatch = text.match(/dia\s+(\d{1,2})(?:\s+de\s+(\w+))?/i);
    if (dayMatch) {
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const d = new Date(now);
        d.setDate(parseInt(dayMatch[1]));
        if (dayMatch[2]) {
            const mIdx = months.findIndex(m => new RegExp(m, 'i').test(dayMatch[2]));
            if (mIdx !== -1) d.setMonth(mIdx);
        }
        return make(d);
    }

    return undefined;
}

function parseTitle(text: string): string {
    let t = text
        .replace(/^(adicionar?\s+tarefa|criar\s+tarefa|nova\s+tarefa|lembrar?\s+(de)?)\s*/i, '')
        .replace(/prioridade\s+(alta|média|media|baixa)/i, '')
        .replace(/urgente|importante/i, '')
        .replace(/[àa]s\s+\d{1,2}(?:[h:]\d{2})?/i, '')
        .replace(/\b(hoje|amanhã|amanha|depois\s+de\s+amanhã?|semana\s+que\s+vem|próxima\s+semana|proxima\s+semana)\b/i, '')
        .replace(/\b(dia\s+\d{1,2}(\s+de\s+\w+)?)\b/i, '')
        .replace(/\b(segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return t.charAt(0).toUpperCase() + t.slice(1);
}

function parseDescription(text: string): string | undefined {
    const match = text.match(/descrição\s+(.+)/i);
    return match ? match[1].trim() : undefined;
}

function parseTranscript(text: string): ParsedTask {
    const time = parseTime(text);
    const date = parseDate(text, time);
    const priority = parsePriority(text);
    const title = parseTitle(text);
    const description = parseDescription(text);
    return { title, priority, date, time, description };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface Props {
    onParsed: (task: ParsedTask) => void;
    onError?: (msg: string) => void;
}

export function useVoiceTaskParser({ onParsed, onError }: Props) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const transcriptRef = useRef('');
    const { requestSpeechRecognitionPermission } = usePermissions();

    useSpeechRecognitionEvent('result', (event) => {
        const text = event.results?.[0]?.transcript ?? '';
        transcriptRef.current = text;
        setTranscript(text);
    });

    useSpeechRecognitionEvent('end', () => {
        setIsListening(false);
        const current = transcriptRef.current;
        if (current) {
            transcriptRef.current = '';
            setTranscript('');
            setTimeout(() => onParsed(parseTranscript(current)), 0);
        }
    });

    useSpeechRecognitionEvent('error', () => {
        setIsListening(false);
        onError?.('Erro ao reconhecer voz');
    });

    const start = async () => {
        const granted = await requestSpeechRecognitionPermission();
        if (!granted) return;
        transcriptRef.current = '';
        setTranscript('');
        ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true });
        setIsListening(true);
    };

    const stop = () => ExpoSpeechRecognitionModule.stop();

    return { isListening, transcript, start, stop };
}