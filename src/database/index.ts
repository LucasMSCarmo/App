import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from '@/src/database/schema';
import migrations from '@/src/database/migrations';
import Task from '@/src/database/model/Task';
import Subtask from '@/src/database/model/Subtask';
import Category from '@/src/database/model/Category';
import TaskCategory from '@/src/database/model/TaskCategory';
import TaskMember from '@/src/database/model/TaskMember';
import Media from '@/src/database/model/Media';
import Comment from '@/src/database/model/Comment';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'AgendinhaDB',
  onSetUpError: error => {
    console.error("Erro ao abrir banco de dados:", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    Task,
    Media,
    Subtask,
    Category,
    TaskCategory,
    TaskMember,
    Comment,
  ],
});
