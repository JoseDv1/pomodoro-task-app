<script lang="ts">
	import { taskManager } from "../hooks/TaskManager";
	import edit from "../../assets/edit.svg?raw";
	import add from "../../assets/add.svg?raw";
	import clear from "../../assets/clear.svg?raw";
	import clearDone from "../../assets/clearDone.svg?raw";
	import trash from "../../assets/trash.svg?raw";

	function openDialog(e: Event) {
		const modal = document.getElementById("addTaskForm") as HTMLDialogElement;
		modal.showModal();
	}
</script>

<main>
	<header>
		<h2>List</h2>

		<div>
			<button on:click={() => taskManager.clearCompletedTasks()}>
				{@html clearDone}
				Clear completed
			</button>
			<button on:click={() => taskManager.clearAllTasks()}>
				{@html clear}
				Clear all</button
			>
			<button on:click={openDialog}>
				{@html add}
				Add Task</button
			>
		</div>
	</header>
	<section>
		<ul>
			{#each $taskManager as task}
				<li class={task.completed ? "completed" : ""}>
					<h3>{task.name}</h3>
					{#if task.description}
						<p>{task.description}</p>
					{/if}

					<div>
						<button
							class="remove"
							on:click={() => taskManager.removeTask(task)}
						>
							{@html trash}
							Remove
						</button>
						<!-- <button
							class="update"
							on:click={() => taskManager.updateTask(task)}
						>
							{@html edit}
							Edit
						</button>
						<input
							type="checkbox"
							on:click={() => {
								taskManager.completeTask(task);
							}}
						/> -->
					</div>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	/* ----- Main ----- */
	main {
		display: flex;
		flex-direction: column;
		grid-column: 2 / 3;
		grid-row: 1 / 3;
		height: 100%;
		gap: 1rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap-reverse;
	}

	header h2 {
		font-size: 3rem;

		@media (max-width: 600px) {
			font-size: 2rem;
		}
	}

	header div {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
	}

	section {
		display: flex;
		flex-direction: column;
		padding: 0;
		gap: 1rem;
		overflow: auto;
		flex: 1;
		border-radius: 10px;
	}

	ul {
		list-style: none;
		padding: 0;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: stretch;
		scroll-snap-type: y mandatory;
	}

	li {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 10px;
		margin-bottom: 0.5rem;
		scroll-snap-align: start;
		word-break: break-word;
	}

	h3 {
		font-size: 2rem;

		@media (max-width: 600px) {
			font-size: 1.5rem;
		}
	}

	p {
		font-size: 1rem;
	}

	div {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
	}

	li div {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;

		& button {
			@media (max-width: 600px) {
				font-size: 0.75rem;

				& svg {
					width: 1rem;
					height: 1rem;
				}
			}
		}
	}

	/* input[type="checkbox"] {
		width: 32px;
		height: 32px;
	} */

	button {
		padding: 0.25rem 1rem;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		font-size: 1rem;
		word-break: normal;
	}

	.remove {
		background-color: #a00;
		color: #fff;

		&:hover {
			background-color: #800;
		}
	}

	/* .update {
		background-color: #0a0;
		color: #fff;

		&:hover {
			background-color: #080;
		}
	} */

	.completed {
		background-color: #00ff0088;
	}

	.completed h3,
	.completed p {
		text-decoration: line-through;
	}

	/* .completed input[type="checkbox"] {
		background-color: #0a0;
	} */
</style>
