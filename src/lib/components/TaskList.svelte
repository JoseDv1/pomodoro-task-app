<script lang="ts">
	import {
		type Task,
		tasks,
		addTask,
		clearCompletedTasks,
		removeTask,
	} from "../stores/task";
	import TrashIcon from "../../assets/trash.svg?raw";

	function handleAddTask(event: SubmitEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const input = form.querySelector("input[type='text']") as HTMLInputElement;
		const taskName = input.value.trim();
		if (!taskName) return;
		const id = crypto.randomUUID();

		addTask({
			id: id,
			name: taskName,
			completed: false,
			createdAt: new Date(),
		});

		form.reset();
	}
</script>

<section>
	<h2>Tareas</h2>
	<ul>
		{#each $tasks as task (task.id)}
			<li>
				<input type="checkbox" bind:checked={task.completed} />
				<span>{task.name}</span>
				<button
					type="button"
					onclick={() => {
						removeTask(task.id);
					}}
					aria-label="Eliminar tarea"
				>
					{@html TrashIcon}
				</button>
			</li>
		{:else}
			<li>
				<span>No hay tareas</span>
			</li>
		{/each}
	</ul>

	<form onsubmit={handleAddTask}>
		<input type="text" placeholder="Nueva tarea" required />
		<button type="submit"> Añadir tarea </button>
		<button type="button" onclick={() => clearCompletedTasks()}>
			Limpiar tareas completadas
		</button>
	</form>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	h2 {
		font-size: 2rem;
		color: var(--text-primary);
	}

	ul {
		list-style-type: none;
		padding: 0;
		width: 100%;
	}

	ul :global(button) {
		background: none;
		border: none;
		cursor: pointer;
	}

	li {
		display: flex;
		align-items: center;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		border-radius: 4px;
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		transition: all 0.3s ease;
		border-left: 3px solid var(--accent-color);
		justify-content: space-between;

		span::first-letter {
			text-transform: uppercase;
		}
	}

	input[type="checkbox"] {
		margin-right: 10px;
	}

	input[type="checkbox"]:checked + span {
		text-decoration: line-through;
	}

	input[type="text"] {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 1rem;
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		transition: all 0.3s ease;
	}

	input[type="text"]:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 2px rgba(255, 99, 71, 0.2);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		margin-top: 1rem;
	}

	button[type="submit"],
	button[type="button"] {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.3s ease;
		font-weight: 500;
	}

	button[type="submit"] {
		background-color: var(--accent-color);
		color: white;
		border: none;
	}

	button[type="submit"]:hover {
		opacity: 0.9;
		transform: translateY(-2px);
	}

	button[type="button"] {
		background-color: var(--bg-tertiary) !important;
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	button[type="button"]:hover {
		border-color: var(--accent-color);
	}
</style>
