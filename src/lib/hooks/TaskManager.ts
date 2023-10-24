import { writable, get } from "svelte/store";
import type { Task, TaskManager } from "../../types/main";

function createTaskManager() {
	const taskList = writable<Array<Task>>(
		JSON.parse(localStorage.getItem("taskList") ?? "[]")
	);

	const { subscribe } = taskList;

	function addTask(e: Event) {
		const form = new FormData(e.target as HTMLFormElement);
		const task: Task = {
			name: form.get("title") as string,
			description: form.get("description") as string,
			completed: false,
			id: crypto.randomUUID(),
		};

		// Add task to the taskList
		taskList.update((list) => [...list, task]);

		// Save taskList in localStorage
		localStorage.setItem("taskList", JSON.stringify(get(taskList)));


		// Reset form
		(e.target as HTMLFormElement).reset();
	}

	function removeTask(task: Task) {
		// Remove task from the taskList
		taskList.update((list) => list.filter((t) => t.id !== task.id));

		// Save taskList in localStorage
		localStorage.setItem("taskList", JSON.stringify(get(taskList)));

	}
	function updateTask(task: Task) {
		// Find task in the taskList
		// Open Dialog with the task data
	}

	function completeTask(task: Task, e: Event) {
		// Make task.completed = true
		taskList.update((list) => {
			const index = list.findIndex((t) => t.id === task.id);
			list[index].completed = !list[index].completed;
			return list;
		});

		// Save taskList in localStorage
		localStorage.setItem("taskList", JSON.stringify(get(taskList)));

	}

	function clearCompletedTasks() {
		// Remove all completed tasks from the taskList
		taskList.update((list) => list.filter((t) => !t.completed));

		// Save taskList in localStorage
		localStorage.setItem("taskList", JSON.stringify(get(taskList)));
	}

	function clearAllTasks() {
		// Remove all tasks from the taskList
		taskList.update((list) => []);

		// Save taskList in localStorage
		localStorage.setItem("taskList", JSON.stringify(get(taskList)));
	}

	return {
		subscribe,
		addTask,
		removeTask,
		updateTask,
		completeTask,
		clearCompletedTasks,
		clearAllTasks
	};
}

export const taskManager = createTaskManager();
