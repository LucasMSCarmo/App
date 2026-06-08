import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 10,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string', isIndexed: true },
        { name: 'deadline_date', type: 'string', isOptional: true },
        { name: 'deadline_time', type: 'string', isOptional: true },
        { name: 'recurrence_type', type: 'string', isOptional: true },
        { name: 'recurrence_weekdays', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'categories',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'subtasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'details', type: 'string', isOptional: true },
        { name: 'status', type: 'boolean' },
        { name: 'order', type: 'number' },
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'media',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'url', type: 'string' },
        { name: 'mime_type', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'size', type: 'number', isOptional: true },
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ]
    }),

    tableSchema({
      name: 'task_categories',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'task_members',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'user_name', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'comments',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'user_name', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
