import { Model } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';

export default class TaskMember extends Model {
  static table = 'task_members';
  static associations = {
    tasks: { type: 'belongs_to', key: 'task_id' },
  } as const;

  @text('task_id') taskId!: string;
  @text('user_id') userId!: string;
  @text('user_name') userName!: string;
  @field('updated_at') updatedAt?: number;
  @field('deleted_at') deletedAt?: number;

  @relation('tasks', 'task_id') task!: any;
}
