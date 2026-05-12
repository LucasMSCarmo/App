import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

export default class Category extends Model {
  static table = 'categories';
  static associations = {
    task_categories: { type: 'has_many', foreignKey: 'category_id' },
  } as const;

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('color') color!: string;
  @text('created_by') createdBy!: string;
}