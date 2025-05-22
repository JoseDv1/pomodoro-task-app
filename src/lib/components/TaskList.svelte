<script lang="ts">
	import {
		type Task,
		tasks,
		addTask,
		clearCompletedTasks,
		removeTask,
		editTask, // Added editTask
	} from "../stores/task";
	import TrashIcon from "../../assets/trash.svg?raw";
	import EditIcon from "../../assets/edit.svg?raw"; // Added EditIcon

	// State variables for editing
	let editingTaskId: string | null = null;
	let editedTaskName: string = "";

	// Function to initiate editing
	function handleStartEdit(task: Task) {
		editingTaskId = task.id;
		editedTaskName = task.name;
	}

	// Function to save the edited task
	function handleSaveEdit(taskId: string) {
		if (editedTaskName.trim() === "") return; // Do not save if name is empty
		editTask(taskId, editedTaskName.trim());
		editingTaskId = null; // Exit editing mode
		editedTaskName = ""; // Reset edited name
	}

	// Function to cancel editing
	function handleCancelEdit() {
		editingTaskId = null; // Exit editing mode
		editedTaskName = ""; // Reset edited name
	}

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
				<input type="checkbox" bind:checked={task.completed} disabled={editingTaskId === task.id} />
				{#if editingTaskId === task.id}
					<input type="text" bind:value={editedTaskName} class="edit-input" data-testid="edit-task-input" placeholder="Editar tarea..." />
					<button type="button" on:click={() => handleSaveEdit(task.id)} aria-label="Guardar tarea" class="save-button" data-testid="save-task-button">Guardar</button>
					<button type="button" on:click={handleCancelEdit} aria-label="Cancelar edición" class="cancel-button" data-testid="cancel-edit-button">Cancelar</button>
				{:else}
					<span>{task.name}</span>
					<div class="task-actions">
						<button
							type="button"
							on:click={() => handleStartEdit(task)}
							aria-label="Editar tarea"
							class="edit-button"
							data-testid={`edit-button-${task.id}`}
						>
							{@html EditIcon}
						</button>
						<button
							type="button"
							on:click={() => removeTask(task.id)}
							aria-label="Eliminar tarea"
							class="delete-button"
							data-testid={`delete-button-${task.id}`}
						>
							{@html TrashIcon}
						</button>
					</div>
				{/if}
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
		padding: 0.25rem; /* Added for better clickability of icons */
		display: flex; /* Added for icon alignment */
		align-items: center; /* Added for icon alignment */
		justify-content: center; /* Added for icon alignment */
	}

	ul :global(button svg) { /* Style for SVGs inside buttons */
		width: 18px;
		height: 18px;
		fill: var(--text-secondary); /* Default color for icons */
		transition: fill 0.2s ease;
	}

	ul :global(button:hover svg) {
		fill: var(--accent-color); /* Icon color on hover */
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
		gap: 0.5rem; /* Added gap between elements in li */
	}

	li span { /* Target span specifically inside li */
		flex-grow: 1; /* Allow span to take available space */
		/* margin-right: 0.5rem; */ /* Replaced by gap on li */
	}
	
	li span::first-letter {
		text-transform: uppercase;
	}
	
	.task-actions { /* Container for edit/delete buttons */
		display: flex;
		align-items: center;
		gap: 0.25rem; /* Space between edit and delete buttons */
	}

	.edit-input { /* Styling for the inline edit input field */
		flex-grow: 1;
		/* margin-right: 0.5rem; */ /* Replaced by gap on li */
		padding: 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 1em; /* Match task name font size */
		background-color: var(--bg-primary); /* Slightly different background for edit */
		color: var(--text-primary);
	}

	.save-button, .cancel-button { /* Styling for Save and Cancel buttons */
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		/* margin-left: 0.25rem; */ /* Replaced by gap on li */
		border: none; /* Remove default border */
	}

	.save-button {
		background-color: var(--accent-color);
		color: white;
	}

	.cancel-button {
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color); /* Subtle border for cancel */
	}
	
	/* .edit-button, .delete-button {
		margin-left: 0.25rem; // Now handled by gap in .task-actions
	} */

	input[type="checkbox"] {
		margin-right: 0; /* Adjusted as li now has gap */
		flex-shrink: 0; /* Prevent checkbox from shrinking */
	}

	input[type="checkbox"]:checked + span { /* Style for completed task text */
		text-decoration: line-through;
		color: var(--text-secondary);
	}

	/* Styles for the main form's text input, to differentiate from edit input */
	form input[type="text"] {
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
