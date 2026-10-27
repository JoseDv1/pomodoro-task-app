<script lang="ts">
	import { onMount } from "svelte";
	import Header from "./lib/components/Header.svelte";
	import MobileNav from "./lib/components/MobileNav.svelte";
	import Timer from "./lib/components/Timer.svelte";
	import TaskList from "./lib/components/TaskList.svelte";
	import SettingsModal from "./lib/components/SettingsModal.svelte";
	import ThemeStoreModal from "./lib/components/ThemeStoreModal.svelte";
	import StatsModal from "./lib/components/StatsModal.svelte";
	import AmbientModal from "./lib/components/AmbientModal.svelte";
	import ShortcutsModal from "./lib/components/ShortcutsModal.svelte";
	import { setupKeyboardShortcuts } from "./lib/utils/shortcuts";
	import { initGoBridge } from "./lib/utils/goBridge";
	import { taskStats } from "./lib/stores/task";

	let isSettingsOpen = $state(false);
	let isThemeStoreOpen = $state(false);
	let isStatsOpen = $state(false);
	let isAmbientOpen = $state(false);
	let isShortcutsOpen = $state(false);

	let mobileTab = $state<"timer" | "tasks">("timer");

	function closeAllModals() {
		isSettingsOpen = false;
		isThemeStoreOpen = false;
		isStatsOpen = false;
		isAmbientOpen = false;
		isShortcutsOpen = false;
	}

	onMount(() => {
		void initGoBridge();

		const cleanupShortcuts = setupKeyboardShortcuts({
			onOpenShortcuts: () => (isShortcutsOpen = true),
			onCloseModals: closeAllModals,
			onFocusNewTask: () => {
				mobileTab = "tasks";
				setTimeout(() => {
					const input = document.querySelector(
						".task-name-input, .add-task-trigger-btn"
					) as HTMLElement | null;
					if (input) input.click();
				}, 50);
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

	<!-- Mobile Segmented Tab Switcher (Visible only on screens <= 850px) -->
	<div class="mobile-segmented-bar" role="tablist">
		<button
			class="segmented-tab {mobileTab === 'timer' ? 'active' : ''}"
			onclick={() => (mobileTab = "timer")}
			role="tab"
			aria-selected={mobileTab === "timer"}
		>
			<span class="tab-emoji">⏱️</span>
			<span>Temporizador</span>
		</button>
		<button
			class="segmented-tab {mobileTab === 'tasks' ? 'active' : ''}"
			onclick={() => (mobileTab = "tasks")}
			role="tab"
			aria-selected={mobileTab === "tasks"}
		>
			<span class="tab-emoji">📝</span>
			<span>Tareas ({$taskStats.active})</span>
		</button>
	</div>

	<!-- Main Responsive Content -->
	<main class="app-main-content">
		<div class="timer-column {mobileTab === 'timer' ? 'mobile-visible' : 'mobile-hidden'}">
			<Timer />
		</div>
		<div class="tasks-column {mobileTab === 'tasks' ? 'mobile-visible' : 'mobile-hidden'}">
			<TaskList />
		</div>
	</main>

	<!-- Footer with Safe Area -->
	<footer class="app-footer">
		<p>
			Pomodoro Focus • Gestión de Tiempo & Tareas
		</p>
	</footer>

	<!-- Bottom Mobile Navigation Bar (Visible only on screens <= 768px) -->
	<MobileNav
		onOpenSettings={() => (isSettingsOpen = true)}
		onOpenThemeStore={() => (isThemeStoreOpen = true)}
		onOpenStats={() => (isStatsOpen = true)}
		onOpenAmbient={() => (isAmbientOpen = true)}
	/>

	<!-- Interactive Modals (Lazy-mounted only when open for 0 background listeners/subscriptions) -->
	{#if isSettingsOpen}
		<SettingsModal
			isOpen={isSettingsOpen}
			onClose={() => (isSettingsOpen = false)}
		/>
	{/if}

	{#if isThemeStoreOpen}
		<ThemeStoreModal
			isOpen={isThemeStoreOpen}
			onClose={() => (isThemeStoreOpen = false)}
		/>
	{/if}

	{#if isStatsOpen}
		<StatsModal
			isOpen={isStatsOpen}
			onClose={() => (isStatsOpen = false)}
		/>
	{/if}

	{#if isAmbientOpen}
		<AmbientModal
			isOpen={isAmbientOpen}
			onClose={() => (isAmbientOpen = false)}
		/>
	{/if}

	{#if isShortcutsOpen}
		<ShortcutsModal
			isOpen={isShortcutsOpen}
			onClose={() => (isShortcutsOpen = false)}
		/>
	{/if}
</div>

<style>
	.app-layout {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-primary);
		width: 100%;
		max-width: 100%;
		position: relative;
	}

	/* Mobile Segmented Bar */
	.mobile-segmented-bar {
		display: none;
		margin: 0.75rem 1rem 0 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 50px;
		padding: 0.25rem;
		gap: 0.25rem;
		max-width: 100%;
		box-sizing: border-box;
	}

	.segmented-tab {
		flex: 1;
		background: transparent;
		border: none;
		border-radius: 50px;
		padding: 0.55rem 0.75rem;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: none;
		min-height: 40px;
	}

	.segmented-tab.active {
		background: var(--accent-color);
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(255, 99, 71, 0.3);
	}

	.tab-emoji {
		font-size: 1rem;
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
		box-sizing: border-box;
	}

	.timer-column,
	.tasks-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		min-width: 0;
	}

	.app-footer {
		padding: 1.25rem 1rem max(1.25rem, env(safe-area-inset-bottom)) 1rem;
		text-align: center;
		border-top: 1px solid var(--border-color);
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	@media (max-width: 850px) {
		.mobile-segmented-bar {
			display: flex;
		}

		.app-main-content {
			grid-template-columns: 1fr;
			padding: 0.75rem 1rem 5rem 1rem;
			gap: 1rem;
		}

		.timer-column.mobile-hidden,
		.tasks-column.mobile-hidden {
			display: none;
		}

		.timer-column.mobile-visible,
		.tasks-column.mobile-visible {
			display: flex;
			animation: fadeIn 0.2s ease;
		}

		.app-footer {
			margin-bottom: 4.5rem;
		}
	}
</style>
