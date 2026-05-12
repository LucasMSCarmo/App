import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string', isIndexed: true },
        { name: 'deadline', type: 'number', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'categories',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'created_by', type: 'string' },
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
      ],
    }),

    tableSchema({
      name: 'task_categories',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isIndexed: true },
      ],
    }),

    tableSchema({
      name: 'task_members',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'user_name', type: 'string' },
      ],
    }),
  ],
});