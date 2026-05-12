import { Model, Q } from '@nozbe/watermelondb';
import { text, children, lazy, date, readonly } from '@nozbe/watermelondb/decorators';
import Category from './Category';

export default class Task extends Model {
  static table = 'tasks';
  static associations = {
    subtasks: { type: 'has_many', foreignKey: 'task_id' },
    task_categories: { type: 'has_many', foreignKey: 'task_id' },
    task_members: { type: 'has_many', foreignKey: 'task_id' },
  } as const;

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @text('status') status!: string;
  @text('priority') priority!: string;
  @date('deadline') deadline?: Date;
  @text('created_by') createdBy!: string;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('task_members') members!: any;
  @children('subtasks') subtasks!: any;

  @lazy categories = this.collections
    .get<Category>('categories')
    .query(
      Q.on('task_categories', 'task_id', this.id)
    );
}