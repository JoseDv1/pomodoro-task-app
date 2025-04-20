import { writable } from "svelte/store";

export interface Task {
	id: string;
	name: string;
	completed: boolean;
	createdAt: Date;
}

const initialTasks: Task[] = JSON.parse(window.localStorage.getItem("tasks") || "[]")

export const tasks = writable<Task[]>(initialTasks)
tasks.subscribe((tasks) => {
	window.localStorage.setItem("tasks", JSON.stringify(tasks));
});


export const addTask = (task: Task) => {
	tasks.update((tasks) => {
		const updatedTasks = [...tasks, task];
		return updatedTasks;
	});
}
export const removeTask = (id: string) => {
	tasks.update((tasks) => {
		const updatedTasks = tasks.filter((task) => task.id !== id);
		return updatedTasks;
	});
}

export const toggleTask = (id: string) => {
	tasks.update((tasks) => {
		const taskIndex = tasks.findIndex((task) => task.id === id);
		if (taskIndex === -1) return tasks;
		tasks[taskIndex].completed = !tasks[taskIndex].completed;
		return tasks;
	});
}

export const clearCompletedTasks = () => {
	tasks.update((tasks) => {
		const updatedTasks = tasks.filter((task) => !task.completed);
		return updatedTasks;
	});
}

