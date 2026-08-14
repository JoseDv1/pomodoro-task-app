<script lang="ts">
	import { onMount } from "svelte";
	import Header from "./lib/components/Header.svelte";
	import Timer from "./lib/components/Timer.svelte";
	import TaskList from "./lib/components/TaskList.svelte";
	import SettingsModal from "./lib/components/SettingsModal.svelte";
	import ThemeStoreModal from "./lib/components/ThemeStoreModal.svelte";
	import StatsModal from "./lib/components/StatsModal.svelte";
	import AmbientModal from "./lib/components/AmbientModal.svelte";
	import ShortcutsModal from "./lib/components/ShortcutsModal.svelte";
	import { setupKeyboardShortcuts } from "./lib/utils/shortcuts";

	let isSettingsOpen = $state(false);
	let isThemeStoreOpen = $state(false);
	let isStatsOpen = $state(false);
	let isAmbientOpen = $state(false);
	let isShortcutsOpen = $state(false);

	function closeAllModals() {
		isSettingsOpen = false;
		isThemeStoreOpen = false;
		isStatsOpen = false;
		isAmbientOpen = false;
		isShortcutsOpen = false;
	}

	onMount(() => {
		const cleanupShortcuts = setupKeyboardShortcuts({
			onOpenShortcuts: () => (isShortcutsOpen = true),
			onCloseModals: closeAllModals,
			onFocusNewTask: () => {
				const input = document.querySelector(
					".task-name-input, .add-task-trigger-btn"
				) as HTMLElement | null;
				if (input) input.click();
			},
		});

		return cleanupShortcuts;
	});
</script>

<div class="app-layout">
	<!-- Top Navigation & Status Bar -->
	<Header
		onOpenSettings={() => (isSettingsOpen = true)}
		onOpenThemeStore={() => (isThemeStoreOpen = true)}
		onOpenStats={() => (isStatsOpen = true)}
		onOpenAmbient={() => (isAmbientOpen = true)}
		onOpenShortcuts={() => (isShortcutsOpen = true)}
	/>

	<!-- Main Two-Column App Content -->
	<main class="app-main-content">
		<div class="timer-column">
			<Timer />
		</div>
		<div class="tasks-column">
			<TaskList />
		</div>
	</main>

	<!-- Footer with Copyright & Links -->
	<footer class="app-footer">
		<p>
			Desarrollado con pasión para maximizar tu enfoque • Pomodoro Task App v2.0
		</p>
	</footer>

	<!-- Interactive Modals -->
	<SettingsModal
		isOpen={isSettingsOpen}
		onClose={() => (isSettingsOpen = false)}
	/>

	<ThemeStoreModal
		isOpen={isThemeStoreOpen}
		onClose={() => (isThemeStoreOpen = false)}
	/>

	<StatsModal
		isOpen={isStatsOpen}
		onClose={() => (isStatsOpen = false)}
	/>

	<AmbientModal
		isOpen={isAmbientOpen}
		onClose={() => (isAmbientOpen = false)}
	/>

	<ShortcutsModal
		isOpen={isShortcutsOpen}
		onClose={() => (isShortcutsOpen = false)}
	/>
</div>

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-primary);
	}

	.app-main-content {
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
		flex: 1;
	}

	.timer-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.tasks-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.app-footer {
		padding: 1.5rem;
		text-align: center;
		border-top: 1px solid var(--border-color);
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	@media (max-width: 900px) {
		.app-main-content {
			grid-template-columns: 1fr;
			padding: 1.25rem 1rem;
			gap: 1.5rem;
		}
	}
</style>
