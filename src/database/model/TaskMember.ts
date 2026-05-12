import { Model } from '@nozbe/watermelondb';
import { text, relation } from '@nozbe/watermelondb/decorators';

export default class TaskMember extends Model {
  static table = 'task_members';
  static associations = {
    tasks: { type: 'belongs_to', key: 'task_id' },
  } as const;

  @text('task_id') taskId!: string;
  @text('user_id') userId!: string;
  @text('user_name') userName!: string;

  @relation('tasks', 'task_id') task!: any;
}