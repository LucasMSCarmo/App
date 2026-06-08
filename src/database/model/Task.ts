import { Model, Q } from '@nozbe/watermelondb';
import { children, date, field, lazy, readonly, text } from '@nozbe/watermelondb/decorators';
import Category from './Category';

export default class Task extends Model {
  static table = 'tasks';
  static associations = {
    media: { type: 'has_many', foreignKey: 'task_id' },
    subtasks: { type: 'has_many', foreignKey: 'task_id' },
    task_categories: { type: 'has_many', foreignKey: 'task_id' },
    task_members: { type: 'has_many', foreignKey: 'task_id' },
    comments: { type: 'has_many', foreignKey: 'task_id' },
  } as const;

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @text('status') status!: string;
  @text('priority') priority!: string;
  @text('deadline_date') deadlineDate?: string;
  @text('deadline_time') deadlineTime?: string;
  @text('recurrence_type') recurrenceType?: string;
  @text('recurrence_weekdays') recurrenceWeekdays?: string;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @text('address') address?: string;
  @text('created_by') createdBy!: string;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('completed_at') completedAt?: number;
  @field('deleted_at') deletedAt?: number;

  @children('task_members') members!: any;
  @children('subtasks') subtasks!: any;
  @children('media') media!: any;
  @children('comments') comments!: any;

  @lazy categories = this.collections
    .get<Category>('categories')
    .query(
      Q.on('task_categories', 'task_id', this.id)
    );
}
