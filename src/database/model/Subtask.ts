import { Model } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';

export default class Subtask extends Model {
  static table = 'subtasks';
  static associations = {
    task: { type: 'belongs_to', key: 'task_id' },
  } as const;

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('details') details!: string;
  @field('status') status!: boolean;
  @field('order') order!: number;
  @text('task_id') taskId!: string;
  @field('updated_at') updatedAt?: number;
  @field('deleted_at') deletedAt?: number;

  @relation('task', 'task_id') task!: any;
}
