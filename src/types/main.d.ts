import type { Writable } from "svelte/store";

export type Task = {
	name: string;
	description: string?;
	completed: boolean = false;
	id: string;
}

export type Pomodoro = {
	toggleCounter: () => void;
	reset: () => void;
	nextTimer: () => void;
}

export type TaskManager = {
	suscribe: Writable<Array<Task>>["subscribe"];
	addTask: (e: Event) => void;
	removeTask: (Task: Task) => void;
	updateTask: (Task: Task) => void;
	completeTask: (Task: Task, e: Event) => void;
}