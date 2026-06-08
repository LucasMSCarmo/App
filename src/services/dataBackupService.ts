import AsyncStorage from '@react-native-async-storage/async-storage';
import { Model, Q } from '@nozbe/watermelondb';
import RNFS from 'react-native-fs';

import { database } from '@/src/database';
import schema from '@/src/database/schema';
import { clearSyncQueue } from '@/src/database/syncQueue';
import { clearSyncTombstones } from '@/src/utils/syncMetadata';

const BACKUP_FORMAT = 'agendinha-backup';
const BACKUP_VERSION = 2;

const PREFERENCE_KEYS = [
  '@theme_mode',
  '@sync_wifi_only',
  '@pomodoro_saved_profiles',
  '@pomodoro_active_profile_id',
  '@pomodoro_dnd_enabled',
] as const;

const TABLES = [
  'tasks',
  'categories',
  'subtasks',
  'media',
  'task_categories',
  'task_members',
  'comments',
] as const;

const DELETE_ORDER = [
  'comments',
  'task_members',
  'task_categories',
  'media',
  'subtasks',
  'categories',
  'tasks',
] as const;

type TableName = typeof TABLES[number];
type BackupRow = Record<string, any>;
type BackupTables = Record<TableName, BackupRow[]>;

type BackupAttachment = {
  fileName: string;
  data: string;
};

type BackupUser = {
  id?: string;
  name?: string;
  email?: string;
};

type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  version: number;
  schemaVersion: number;
  exportedAt: string;
  user?: BackupUser;
  data: BackupTables;
  preferences: Record<string, string>;
  attachments: Record<string, BackupAttachment>;
  attachmentIssues: string[];
};

export type BackupSummary = {
  exportedAt: string;
  taskCount: number;
  categoryCount: number;
  subtaskCount: number;
  attachmentCount: number;
  warningCount: number;
  warnings: string[];
};

type ParsedBackup = {
  envelope: BackupEnvelope;
  summary: BackupSummary;
};

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function collection(table: TableName) {
  return database.get<Model>(table);
}

function allRecords(table: TableName) {
  return collection(table)
    .query(Q.unsafeSqlQuery(`select * from "${table}"`))
    .fetch();
}

function isSafeRecordId(value: string) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function cleanRawForExport(table: TableName, raw: BackupRow): BackupRow {
  const tableSchema = schema.tables[table];
  const result: BackupRow = { id: raw.id };

  for (const column of tableSchema.columnArray) {
    result[column.name] = raw[column.name] ?? null;
  }

  return result;
}

function defaultLegacyValue(column: string) {
  if (column === 'updated_at' || column === 'created_at') return Date.now();
  return undefined;
}

function normalizeRow(table: TableName, value: unknown, index: number): BackupRow {
  if (!isPlainObject(value)) {
    throw new BackupValidationError(`Registro inválido em "${table}" na posição ${index + 1}.`);
  }

  const id = value.id;
  if (
    typeof id !== 'string'
    || !id.trim()
    || id.length > 255
    || !isSafeRecordId(id)
  ) {
    throw new BackupValidationError(`ID inválido em "${table}" na posição ${index + 1}.`);
  }

  const tableSchema = schema.tables[table];
  const normalized: BackupRow = {
    id,
    _status: 'synced',
    _changed: '',
  };

  for (const column of tableSchema.columnArray) {
    let columnValue = value[column.name];
    if (columnValue === undefined) {
      columnValue = column.isOptional ? null : defaultLegacyValue(column.name);
      if (columnValue === undefined) {
        throw new BackupValidationError(
          `O campo "${column.name}" está ausente em "${table}" (${id}).`,
        );
      }
    }

    if (columnValue === null) {
      if (!column.isOptional) {
        throw new BackupValidationError(
          `O campo "${column.name}" é obrigatório em "${table}" (${id}).`,
        );
      }
      normalized[column.name] = null;
      continue;
    }

    const validBoolean = column.type === 'boolean'
      && (typeof columnValue === 'boolean' || columnValue === 0 || columnValue === 1);
    const validNumber = column.type === 'number'
      && typeof columnValue === 'number'
      && Number.isFinite(columnValue);
    const validString = column.type === 'string' && typeof columnValue === 'string';

    if (!validBoolean && !validNumber && !validString) {
      throw new BackupValidationError(
        `Tipo inválido para "${column.name}" em "${table}" (${id}).`,
      );
    }

    normalized[column.name] = validBoolean ? Boolean(columnValue) : columnValue;
  }

  return normalized;
}

function readArray(source: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key];
  }
  return [];
}

function normalizeTables(payload: Record<string, any>, warnings: string[]): BackupTables {
  const data = isPlainObject(payload.data) ? payload.data : payload;
  const isCurrentFormat = payload.format === BACKUP_FORMAT;
  const requiredKeys = isCurrentFormat
    ? ['tasks', 'categories', 'subtasks', 'media', 'task_categories', 'task_members', 'comments']
    : ['tasks', 'categories', 'subtasks', 'media', 'members', 'comments'];

  if (!requiredKeys.every((key) => Array.isArray(data[key]))) {
    throw new BackupValidationError('O arquivo está incompleto e não pode substituir os dados atuais.');
  }

  const hasTaskCategories = Array.isArray(data.task_categories)
    || Array.isArray(data.taskCategories)
    || Array.isArray(payload.task_categories)
    || Array.isArray(payload.taskCategories);

  if (!hasTaskCategories && payload.format !== BACKUP_FORMAT) {
    warnings.push('Este backup antigo não contém vínculos entre tarefas e categorias.');
  }

  const rawTables: Record<TableName, unknown[]> = {
    tasks: readArray(data, 'tasks'),
    categories: readArray(data, 'categories'),
    subtasks: readArray(data, 'subtasks'),
    media: readArray(data, 'media'),
    task_categories: readArray(data, 'task_categories', 'taskCategories'),
    task_members: readArray(data, 'task_members', 'members', 'taskMembers'),
    comments: readArray(data, 'comments'),
  };

  return Object.fromEntries(
    TABLES.map((table) => [
      table,
      rawTables[table].map((row, index) => normalizeRow(table, row, index)),
    ]),
  ) as BackupTables;
}

function validateUniqueIds(tables: BackupTables) {
  for (const table of TABLES) {
    const seen = new Set<string>();
    for (const row of tables[table]) {
      if (seen.has(row.id)) {
        throw new BackupValidationError(`O backup possui IDs duplicados na tabela "${table}".`);
      }
      seen.add(row.id);
    }
  }
}

function validateRelations(tables: BackupTables) {
  const taskIds = new Set(tables.tasks.map((row) => row.id));
  const categoryIds = new Set(tables.categories.map((row) => row.id));

  const taskRelations: [TableName, BackupRow[]][] = [
    ['subtasks', tables.subtasks],
    ['media', tables.media],
    ['task_members', tables.task_members],
    ['comments', tables.comments],
    ['task_categories', tables.task_categories],
  ];

  for (const [table, rows] of taskRelations) {
    for (const row of rows) {
      if (!taskIds.has(row.task_id)) {
        throw new BackupValidationError(
          `O registro "${row.id}" em "${table}" referencia uma tarefa inexistente.`,
        );
      }
    }
  }

  for (const row of tables.task_categories) {
    if (!categoryIds.has(row.category_id)) {
      throw new BackupValidationError(
        `O vínculo "${row.id}" referencia uma categoria inexistente.`,
      );
    }
  }
}

function normalizeAttachments(value: unknown): Record<string, BackupAttachment> {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new BackupValidationError('A seção de anexos do backup é inválida.');
  }

  const result: Record<string, BackupAttachment> = Object.create(null);
  for (const [mediaId, attachment] of Object.entries(value)) {
    if (
      !isSafeRecordId(mediaId)
      ||
      !isPlainObject(attachment)
      || typeof attachment.fileName !== 'string'
      || !attachment.fileName
      || typeof attachment.data !== 'string'
      || !attachment.data
    ) {
      throw new BackupValidationError(`O anexo "${mediaId}" está corrompido.`);
    }
    result[mediaId] = {
      fileName: attachment.fileName,
      data: attachment.data,
    };
  }
  return result;
}

function parseBackup(content: string, currentUserId?: string): ParsedBackup {
  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new BackupValidationError('O arquivo selecionado não contém um JSON válido.');
  }

  if (!isPlainObject(payload)) {
    throw new BackupValidationError('O arquivo não possui uma estrutura de backup válida.');
  }

  if (payload.format === BACKUP_FORMAT && Number(payload.version) > BACKUP_VERSION) {
    throw new BackupValidationError(
      'Este backup foi criado por uma versão mais nova do aplicativo.',
    );
  }
  if (payload.format === BACKUP_FORMAT && Number(payload.schemaVersion) > schema.version) {
    throw new BackupValidationError(
      'Este backup usa uma estrutura de banco mais nova que a instalada.',
    );
  }

  const backupUser = isPlainObject(payload.user) ? payload.user : undefined;
  const backupUserId = backupUser?.id ? String(backupUser.id) : undefined;
  if (currentUserId && backupUserId && String(currentUserId) !== backupUserId) {
    throw new BackupValidationError('Este backup pertence a outra conta.');
  }

  const warnings = Array.isArray(payload.attachmentIssues)
    ? payload.attachmentIssues.filter((item): item is string => typeof item === 'string')
    : [];
  const tables = normalizeTables(payload, warnings);
  validateUniqueIds(tables);
  validateRelations(tables);

  const attachments = normalizeAttachments(payload.attachments);
  const mediaIds = new Set(tables.media.map((row) => row.id));
  for (const mediaId of Object.keys(attachments)) {
    if (!mediaIds.has(mediaId)) {
      throw new BackupValidationError(`O anexo "${mediaId}" não possui mídia correspondente.`);
    }
  }

  if (payload.format !== BACKUP_FORMAT && tables.media.length > 0) {
    warnings.push('Backups antigos restauram os dados dos anexos, mas não seus arquivos locais.');
  }
  const sourceVersion = payload.format === BACKUP_FORMAT
    ? Number(payload.version) || 1
    : 1;
  if (sourceVersion >= 2) {
    for (const media of tables.media) {
      const mediaName = String(media.name || 'anexo');
      const alreadyReported = warnings.some((warning) => warning.includes(`"${mediaName}"`));
      if (mediaPath(media) && !attachments[media.id] && !alreadyReported) {
        warnings.push(`O arquivo de "${media.name || 'anexo'}" não está incluído no backup.`);
      }
    }
  }

  const exportedAt = typeof payload.exportedAt === 'string'
    && !Number.isNaN(new Date(payload.exportedAt).getTime())
    ? payload.exportedAt
    : new Date().toISOString();

  const uniqueWarnings = [...new Set(warnings)];
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: sourceVersion,
    schemaVersion: Number(payload.schemaVersion) || schema.version,
    exportedAt,
    user: backupUser ? {
      id: backupUserId,
      name: typeof backupUser.name === 'string' ? backupUser.name : undefined,
      email: typeof backupUser.email === 'string' ? backupUser.email : undefined,
    } : undefined,
    data: tables,
    preferences: isPlainObject(payload.preferences)
      ? Object.fromEntries(
        Object.entries(payload.preferences)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
      : {},
    attachments,
    attachmentIssues: uniqueWarnings,
  };

  return {
    envelope,
    summary: {
      exportedAt,
      taskCount: tables.tasks.length,
      categoryCount: tables.categories.length,
      subtaskCount: tables.subtasks.length,
      attachmentCount: tables.media.length,
      warningCount: uniqueWarnings.length,
      warnings: uniqueWarnings,
    },
  };
}

function mediaPath(row: BackupRow) {
  const url = String(row.url || '');
  if (!url || /^https?:\/\//i.test(url)) return null;
  if (url.startsWith('file://')) return url.slice('file://'.length);
  if (url.startsWith('/')) return url;
  return `${RNFS.DocumentDirectoryPath}/${row.type}/${url}`;
}

function safeExtension(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const clean = value.split('?')[0].split('#')[0];
    const match = clean.match(/\.([a-zA-Z0-9]{1,10})$/);
    if (match) return match[1].toLowerCase();
  }
  return 'bin';
}

async function readPreferences() {
  const pairs = await AsyncStorage.multiGet([...PREFERENCE_KEYS]);
  return Object.fromEntries(
    pairs.filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

export async function createDataBackup(user?: BackupUser) {
  const rowsByTable = await Promise.all(
    TABLES.map(async (table) => {
      const records = await collection(table).query().fetch();
      return [
        table,
        records.map((record: any) => cleanRawForExport(table, record._raw)),
      ] as const;
    }),
  );
  const data = Object.fromEntries(rowsByTable) as BackupTables;
  const attachments: Record<string, BackupAttachment> = {};
  const attachmentIssues: string[] = [];

  for (const row of data.media) {
    const path = mediaPath(row);
    if (!path) continue;
    try {
      if (!(await RNFS.exists(path))) {
        attachmentIssues.push(`O arquivo local de "${row.name || 'anexo'}" não foi encontrado.`);
        continue;
      }
      attachments[row.id] = {
        fileName: String(row.url || row.name || row.id),
        data: await RNFS.readFile(path, 'base64'),
      };
    } catch {
      attachmentIssues.push(`Não foi possível incluir "${row.name || 'anexo'}" no backup.`);
    }
  }

  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: schema.version,
    exportedAt: new Date().toISOString(),
    user,
    data,
    preferences: await readPreferences(),
    attachments,
    attachmentIssues,
  };

  return {
    content: JSON.stringify(envelope, null, 2),
    summary: {
      exportedAt: envelope.exportedAt,
      taskCount: data.tasks.length,
      categoryCount: data.categories.length,
      subtaskCount: data.subtasks.length,
      attachmentCount: data.media.length,
      warningCount: attachmentIssues.length,
      warnings: attachmentIssues,
    } satisfies BackupSummary,
  };
}

export function inspectDataBackup(content: string, currentUserId?: string) {
  return parseBackup(content, currentUserId).summary;
}

async function restoreAttachmentFiles(envelope: BackupEnvelope) {
  const createdPaths: string[] = [];
  const warnings = [...envelope.attachmentIssues];
  const mediaById = new Map(envelope.data.media.map((row) => [row.id, row]));
  const restoreId = Date.now();

  try {
    for (const [mediaId, attachment] of Object.entries(envelope.attachments)) {
      const media = mediaById.get(mediaId);
      if (!media) continue;

      const type = ['image', 'video', 'audio', 'document'].includes(media.type)
        ? media.type
        : 'document';
      const extension = safeExtension(attachment.fileName, media.url, media.name);
      const fileName = `restore_${restoreId}_${media.id}.${extension}`;
      const directory = `${RNFS.DocumentDirectoryPath}/${type}`;
      const path = `${directory}/${fileName}`;

      await RNFS.mkdir(directory);
      await RNFS.writeFile(path, attachment.data, 'base64');
      createdPaths.push(path);
      media.url = fileName;
      media.type = type;
    }
  } catch (error) {
    await removeFiles(createdPaths);
    throw error;
  }

  return { createdPaths, warnings };
}

async function removeFiles(paths: string[]) {
  await Promise.all(paths.map(async (path) => {
    try {
      if (await RNFS.exists(path)) await RNFS.unlink(path);
    } catch {
      // A limpeza de arquivo órfão não deve invalidar uma restauração concluída.
    }
  }));
}

export async function restoreDataBackup(content: string, currentUserId?: string) {
  const parsed = parseBackup(content, currentUserId);
  const currentMedia = await collection('media').query().fetch();
  const oldMediaPaths = currentMedia
    .map((record: any) => mediaPath(record._raw))
    .filter((path): path is string => !!path);
  const { createdPaths, warnings } = await restoreAttachmentFiles(parsed.envelope);

  try {
    await database.write(async () => {
      const removals: Model[] = [];
      for (const table of DELETE_ORDER) {
        const records = await allRecords(table);
        removals.push(...records.map((record) => record.prepareDestroyPermanently()));
      }

      const creations: Model[] = [];
      for (const table of TABLES) {
        for (const raw of parsed.envelope.data[table]) {
          creations.push(collection(table).prepareCreateFromDirtyRaw(raw));
        }
      }

      await database.batch([...removals, ...creations]);
    });
  } catch (error) {
    await removeFiles(createdPaths);
    throw error;
  }

  const restoredMediaPaths = parsed.envelope.data.media
    .map((row) => mediaPath(row))
    .filter((path): path is string => !!path);
  await removeFiles(
    oldMediaPaths.filter(
      (path) => !createdPaths.includes(path) && !restoredMediaPaths.includes(path),
    ),
  );
  try {
    await Promise.all([
      clearSyncQueue(),
      clearSyncTombstones(),
    ]);
  } catch {
    warnings.push('Não foi possível limpar totalmente o estado antigo de sincronização.');
  }

  const allowedPreferences = Object.entries(parsed.envelope.preferences)
    .filter(([key]) => (PREFERENCE_KEYS as readonly string[]).includes(key));
  if (allowedPreferences.length > 0) {
    try {
      await AsyncStorage.multiSet(allowedPreferences);
    } catch {
      warnings.push('Algumas preferências do aplicativo não puderam ser restauradas.');
    }
  }

  const uniqueWarnings = [...new Set(warnings)];
  return {
    ...parsed.summary,
    warningCount: uniqueWarnings.length,
    warnings: uniqueWarnings,
  };
}
