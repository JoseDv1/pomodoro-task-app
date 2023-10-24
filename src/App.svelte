<script lang="ts">
	// Imports
	import AddTaskForm from "./lib/components/AddTaskForm.svelte";
	import TaskList from "./lib/components/TaskList.svelte";
	import Timer from "./lib/components/Timer.svelte";
	import { onMount } from "svelte";

	onMount(() => {
		// Pedir permiso para mostrar notificaciones
		Notification.requestPermission();
	});
</script>

<h1>Pomodoro App</h1>
<main>
	<!-- Cuenta atras -->
	<Timer />
	<!-- Lista de tareas -->
	<TaskList />
	<!-- POPUP Formulario -->
	<AddTaskForm />
</main>

<style>
	main {
		display: grid;
		grid-template-columns: 30% 1fr;
		grid-template-rows: 1fr;
		grid-gap: 1rem;
		height: 100dvh;
		max-height: calc(100vh - 5rem);
	}

	@media (width < 1300px) {
		h1 {
			text-align: center;
		}

		main {
			display: flex;
			gap: 1rem;
			flex-direction: column;
			height: auto;
			max-height: none;
		}
	}
</style>
