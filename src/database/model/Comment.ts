import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

export default class Comment extends Model {
  static table = 'comments';
  static associations = {
    tasks: { type: 'belongs_to', key: 'task_id' },
  } as const;

  @text('server_id') serverId!: string;
  @text('task_id') taskId!: string;
  @text('user_id') userId!: string;
  @text('user_name') userName!: string;
  @text('body') body!: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('deleted_at') deletedAt?: number;

  @relation('tasks', 'task_id') task!: any;
}
