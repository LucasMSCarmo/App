import { Model } from '@nozbe/watermelondb';
import { text, relation } from '@nozbe/watermelondb/decorators';

export default class TaskCategory extends Model {
  static table = 'task_categories';
  static associations = {
    tasks: { type: 'belongs_to', key: 'task_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
  } as const;

  @text('task_id') taskId!: string;
  @text('category_id') categoryId!: string;

  @relation('tasks', 'task_id') task!: any;
  @relation('categories', 'category_id') category!: any;
}