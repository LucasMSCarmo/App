import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'recurrence_type', type: 'string', isOptional: true },
            { name: 'recurrence_weekdays', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        createTable({
          name: 'comments',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'task_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'user_name', type: 'string' },
            { name: 'body', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'categories',
          columns: [
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'subtasks',
          columns: [
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'media',
          columns: [
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'task_categories',
          columns: [
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'task_members',
          columns: [
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'comments',
          columns: [
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'completed_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
