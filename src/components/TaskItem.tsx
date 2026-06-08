import Task from '@/src/database/model/Task';
import { Q } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import TaskCard, { TaskCardVariant } from './TaskCard';

type CardContext = 'calendar-month' | 'home' | 'tasks';

interface Props {
    task: Task;
    membersCount: number;
    subtasksCount: number;
    completedCount: number;
    type?: CardContext;
}

function getCardOptions(type?: CardContext): {
    variant: TaskCardVariant;
    showDate: boolean;
    showTime: boolean;
    showStatus: boolean;
    showDescription: boolean;
} {
    if (type === 'home') {
        return {
            variant: 'list',
            showDate: false,
            showTime: true,
            showStatus: true,
            showDescription: true,
        };
    }

    if (type === 'tasks') {
        return {
            variant: 'list',
            showDate: true,
            showTime: true,
            showStatus: true,
            showDescription: true,
        };
    }

    return {
        variant: 'calendar',
        showDate: true,
        showTime: true,
        showStatus: false,
        showDescription: false,
    };
}

const TaskItemCard = ({ task, membersCount, subtasksCount, completedCount, type }: Props) => {
    const options = getCardOptions(type);

    return (
        <TaskCard
            task={task}
            membersCount={membersCount}
            subtasksCount={subtasksCount}
            completedCount={completedCount}
            {...options}
        />
    );
};

const TaskItem = withObservables(['task'], ({ task }: { task: Task }) => ({
    task: task.observe(),
    membersCount: task.members.observeCount(),
    subtasksCount: task.subtasks.observeCount(),
    completedCount: task.subtasks.extend(Q.where('status', Q.eq(true))).observeCount(),
}))(TaskItemCard);

export default TaskItem;
