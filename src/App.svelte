<script lang="ts">
	import TaskList from "./lib/components/TaskList.svelte";
	import Timer from "./lib/components/Timer.svelte";
	import PomodoroCounter from "./lib/components/PomodoroCounter.svelte";
	import ThemeStore from "./lib/components/ThemeStore.svelte";
	import Settings from "./lib/components/Settings.svelte";

	$effect(() => {
		if (typeof window !== "undefined" && "Notification" in window) {
			Notification.requestPermission();
		}
	});

	// Aplicar clase para la transición al cambiar de tema
	$effect(() => {
		if (typeof document !== "undefined") {
			document.body.classList.add("theme-transition");
		}
	});
</script>

<main>
	<ThemeStore />
	<Settings />
	<PomodoroCounter />
	<div>
		<Timer />
	</div>
	<div>
		<TaskList />
	</div>
</main>

<style>
	main {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	div {
		background-color: var(--card-bg);
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 2px 8px var(--shadow-color);
		transition: all 0.3s ease;
	}
</style>
