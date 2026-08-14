import { writable, derived, get } from 'svelte/store';
import type { Task, TaskPriority } from '../types';
import { recordCompletedTask } from './stats';

const TASK_STORAGE_KEY = 'pomodoro_tasks_v2';
const ACTIVE_TASK_KEY = 'pomodoro_active_task_id';

function loadTasks(): Task[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(TASK_STORAGE_KEY) || localStorage.getItem('tasks');
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		
		return parsed.map((t: Partial<Task> & { createdAt?: Date | string }) => ({
			id: t.id || crypto.randomUUID(),
			name: t.name || 'Tarea sin título',
			completed: Boolean(t.completed),
			estimatedPomodoros: typeof t.estimatedPomodoros === 'number' ? t.estimatedPomodoros : 1,
			completedPomodoros: typeof t.completedPomodoros === 'number' ? t.completedPomodoros : 0,
			priority: (t.priority as TaskPriority) || 'medium',
			category: t.category || '',
			createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
			completedAt: t.completedAt || null,
		}));
	} catch (e) {
		console.error('Error loading tasks:', e);
		return [];
	}
}

export const tasks = writable<Task[]>(loadTasks());

export const activeTaskId = writable<string | null>(
	typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_TASK_KEY) : null
);

export const taskFilter = writable<'all' | 'active' | 'completed'>('all');
export const taskSearch = writable<string>('');

if (typeof window !== 'undefined') {
	tasks.subscribe((list) => {
		try {
			localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(list));
		} catch (e) {
			console.error('Error saving tasks:', e);
		}
	});

	activeTaskId.subscribe((id) => {
		try {
			if (id) {
				localStorage.setItem(ACTIVE_TASK_KEY, id);
			} else {
				localStorage.removeItem(ACTIVE_TASK_KEY);
			}
		} catch (e) {
			console.error('Error saving active task ID:', e);
		}
	});
}

export const activeTask = derived(
	[tasks, activeTaskId],
	([$tasks, $activeTaskId]) => {
		if (!$activeTaskId) return null;
		return $tasks.find((t) => t.id === $activeTaskId) || null;
	}
);

export const filteredTasks = derived(
	[tasks, taskFilter, taskSearch],
	([$tasks, $filter, $search]) => {
		let result = $tasks;

		if ($filter === 'active') {
			result = result.filter((t) => !t.completed);
		} else if ($filter === 'completed') {
			result = result.filter((t) => t.completed);
		}

		if ($search.trim()) {
			const query = $search.toLowerCase().trim();
			result = result.filter((t) =>
				t.name.toLowerCase().includes(query) || (t.category && t.category.toLowerCase().includes(query))
			);
		}

		return result;
	}
);

export const taskStats = derived(tasks, ($tasks) => {
	const total = $tasks.length;
	const completed = $tasks.filter((t) => t.completed).length;
	const active = total - completed;
	const estimatedTotal = $tasks.reduce((sum, t) => sum + (t.estimatedPomodoros || 1), 0);
	const completedTotal = $tasks.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);

	return {
		total,
		completed,
		active,
		estimatedTotal,
		completedTotal,
		progress: total > 0 ? Math.round((completed / total) * 100) : 0,
	};
});

export function addTask(params: {
	name: string;
	estimatedPomodoros?: number;
	priority?: TaskPriority;
	category?: string;
}): Task {
	const newTask: Task = {
		id: crypto.randomUUID(),
		name: params.name.trim(),
		completed: false,
		estimatedPomodoros: Math.max(1, params.estimatedPomodoros || 1),
		completedPomodoros: 0,
		priority: params.priority || 'medium',
		category: params.category?.trim() || '',
		createdAt: new Date().toISOString(),
		completedAt: null,
	};

	tasks.update((list) => [newTask, ...list]);

	// If no active task is set, automatically select the new task
	if (!get(activeTaskId)) {
		activeTaskId.set(newTask.id);
	}

	return newTask;
}

export function updateTask(id: string, partial: Partial<Task>): void {
	tasks.update((list) =>
		list.map((t) => (t.id === id ? { ...t, ...partial } : t))
	);
}

export function toggleTask(id: string): void {
	tasks.update((list) =>
		list.map((t) => {
			if (t.id === id) {
				const isNowCompleted = !t.completed;
				if (isNowCompleted) {
					recordCompletedTask();
				}
				return {
					...t,
					completed: isNowCompleted,
					completedAt: isNowCompleted ? new Date().toISOString() : null,
				};
			}
			return t;
		})
	);
}

export function removeTask(id: string): void {
	tasks.update((list) => list.filter((t) => t.id !== id));
	if (get(activeTaskId) === id) {
		activeTaskId.set(null);
	}
}

export function setActiveTask(id: string | null): void {
	activeTaskId.set(id);
}

export function incrementActiveTaskPomodoro(): void {
	const currActiveId = get(activeTaskId);
	if (!currActiveId) return;

	tasks.update((list) =>
		list.map((t) => {
			if (t.id === currActiveId) {
				return {
					...t,
					completedPomodoros: (t.completedPomodoros || 0) + 1,
				};
			}
			return t;
		})
	);
}

export function clearCompletedTasks(): void {
	tasks.update((list) => list.filter((t) => !t.completed));
	const currentActive = get(activeTask);
	if (currentActive && currentActive.completed) {
		activeTaskId.set(null);
	}
}

export function clearAllTasks(): void {
	tasks.set([]);
	activeTaskId.set(null);
}
