<script lang="ts">
	import { taskManager } from "../hooks/TaskManager";

	function handleCloseModal(e: Event) {
		const modal = document.getElementById("addTaskForm") as HTMLDialogElement;
		modal.close();
	}
</script>

<!-- Formulario para añadir tareas -->
<dialog id="addTaskForm">
	<form on:submit|preventDefault={taskManager.addTask}>
		<p>Task</p>
		<input type="text" placeholder="Limpiar..." name="title" required />
		<p>Description</p>
		<textarea
			name="description"
			id=""
			cols="50"
			rows="5"
			placeholder="Limpiar la casa con la aspiradora..."
		/>
		<div>
			<button>Add</button>
			<button on:click={handleCloseModal}>Close</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	/* ----- Form Styles ----- */
	form {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		justify-content: center;
		align-items: stretch;
		border-radius: 5px;
	}

	p {
		font-weight: bold;
		font-size: 1.5rem;
	}

	*:not(button, p, div) {
		margin-bottom: 1rem;
	}

	div {
		align-self: flex-end;
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: center;
	}

	button {
		padding: 0.25rem 1rem;
		border: none;
		border-radius: 5px;
		background-color: #ccc;
		cursor: pointer;
		font-size: 1rem;

		&:hover {
			background-color: #aaa;
		}

		&:active {
			background-color: #888;
		}
	}

	input,
	textarea {
		padding: 0.5rem;
		border: none;
		border-radius: 5px;
		font-size: 1rem;
	}

	textarea {
		resize: none;
	}
</style>
