import { Model } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';

export default class Media extends Model {
  static table = 'media';
  static associations = {
    task: { type: 'belongs_to', key: 'task_id' },
  } as const;

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('url') url!: string;
  @text('mime_type') mime_type!: string;
  @text('type') type!: string;
  @field('size') size!: number;
  @text('task_id') taskId!: string;

  @relation('task', 'task_id') task!: any;
}