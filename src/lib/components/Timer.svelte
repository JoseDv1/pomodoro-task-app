<script lang="ts">
	import {
		mode,
		duration,
		timeLeft,
		isRunning,
		cycleCount,
		timerDisplay,
		progress,
		switchMode,
		toggleTimer,
		resetTimer,
		skipTimer,
		addSeconds,
	} from "../stores/timer";
	import { settings } from "../stores/settings";
	import { activeTask, setActiveTask } from "../stores/task";

	// SVG circle geometry constants
	const RADIUS = 135;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let strokeDashoffset = $derived(
		CIRCUMFERENCE - ($progress / 100) * CIRCUMFERENCE
	);

	let modeColor = $derived(
		$mode === "work"
			? "var(--accent-color)"
			: $mode === "shortBreak"
				? "#38bdf8"
				: "#818cf8"
	);
</script>

<section class="glass-card timer-section">
	<!-- Timer Mode Selector Tabs -->
	<div class="mode-tabs" role="tablist">
		<button
			class="mode-tab {$mode === 'work' ? 'active' : ''}"
			onclick={() => switchMode("work")}
			role="tab"
			aria-selected={$mode === "work"}
		>
			<span class="tab-icon">🍅</span>
			<span class="tab-label">Enfoque</span>
		</button>

		<button
			class="mode-tab {$mode === 'shortBreak' ? 'active' : ''}"
			onclick={() => switchMode("shortBreak")}
			role="tab"
			aria-selected={$mode === "shortBreak"}
		>
			<span class="tab-icon">☕</span>
			<span class="tab-label">Corto</span>
		</button>

		<button
			class="mode-tab {$mode === 'longBreak' ? 'active' : ''}"
			onclick={() => switchMode("longBreak")}
			role="tab"
			aria-selected={$mode === "longBreak"}
		>
			<span class="tab-icon">🌴</span>
			<span class="tab-label">Largo</span>
		</button>
	</div>

	<!-- Active Task Quick Banner -->
	{#if $activeTask}
		<div class="active-task-banner">
			<span class="active-tag">🎯</span>
			<span class="active-task-name" title={$activeTask.name}>{$activeTask.name}</span>
			<button
				class="deselect-task-btn"
				onclick={() => setActiveTask(null)}
				title="Desvincular tarea"
				aria-label="Desvincular tarea"
			>
				✕
			</button>
		</div>
	{/if}

	<!-- Circular Visual Progress Ring -->
	<div class="circular-timer-container">
		<svg
			class="progress-ring"
			viewBox="0 0 320 320"
		>
			<defs>
				<linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color={modeColor} />
					<stop offset="100%" stop-color="var(--accent-hover)" />
				</linearGradient>
			</defs>

			<!-- Background Track -->
			<circle
				class="progress-ring-track"
				cx="160"
				cy="160"
				r={RADIUS}
				stroke-width="12"
				fill="transparent"
			/>

			<!-- Animated Progress Indicator -->
			<circle
				class="progress-ring-indicator"
				cx="160"
				cy="160"
				r={RADIUS}
				stroke-width="12"
				stroke="url(#timerGradient)"
				stroke-linecap="round"
				fill="transparent"
				stroke-dasharray={CIRCUMFERENCE}
				style="stroke-dashoffset: {strokeDashoffset};"
			/>
		</svg>

		<!-- Central Clock Display -->
		<div class="timer-center-content">
			<span class="mode-badge" style="color: {modeColor};">
				{$mode === "work"
					? "Enfoque"
					: $mode === "shortBreak"
						? "Descanso"
						: "Descanso Largo"}
			</span>

			<div class="timer-digits">
				{$timerDisplay}
			</div>

			<!-- Pomodoro Cycle Dots -->
			<div class="cycle-indicator" title="Progreso del ciclo de 4 pomodoros">
				{#each Array(Math.max(1, $settings.longBreakInterval)) as _, idx}
					<span class="cycle-dot">
						{idx < $cycleCount ? "🍅" : "⚪"}
					</span>
				{/each}
				<span class="cycle-text">{$cycleCount}/{$settings.longBreakInterval}</span>
			</div>
		</div>
	</div>

	<!-- Quick +/- Adjustments -->
	<div class="quick-time-adjustments">
		<button
			class="adjust-btn"
			onclick={() => addSeconds(-60)}
			title="Restar 1 minuto"
			aria-label="Restar 1 minuto"
		>
			-1m
		</button>
		<button
			class="adjust-btn"
			onclick={() => addSeconds(60)}
			title="Añadir 1 minuto"
			aria-label="Añadir 1 minuto"
		>
			+1m
		</button>
		<button
			class="adjust-btn"
			onclick={() => addSeconds(300)}
			title="Añadir 5 minutos"
			aria-label="Añadir 5 minutos"
		>
			+5m
		</button>
	</div>

	<!-- Main Timer Controls -->
	<div class="timer-actions">
		<!-- Reset Button -->
		<button
			class="control-btn secondary"
			onclick={resetTimer}
			title="Reiniciar sesión (Shift + R)"
			aria-label="Reiniciar sesión"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="1 4 1 10 7 10"></polyline>
				<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
			</svg>
			<span class="btn-text">Reiniciar</span>
		</button>

		<!-- Main Start / Pause Button -->
		<button
			class="control-btn primary big-action"
			onclick={toggleTimer}
			title="Espacio para Iniciar o Pausar"
			aria-label={$isRunning ? "Pausar temporizador" : "Iniciar temporizador"}
		>
			{#if $isRunning}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<rect x="6" y="4" width="4" height="16"></rect>
					<rect x="14" y="4" width="4" height="16"></rect>
				</svg>
				<span>Pausar</span>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<polygon points="5 3 19 12 5 21 5 3"></polygon>
				</svg>
				<span>Iniciar</span>
			{/if}
		</button>

		<!-- Skip Button -->
		<button
			class="control-btn secondary"
			onclick={skipTimer}
			title="Saltar a siguiente sesión (Shift + S)"
			aria-label="Saltar sesión"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polygon points="5 4 15 12 5 20 5 4"></polygon>
				<line x1="19" y1="5" x2="19" y2="19"></line>
			</svg>
			<span class="btn-text">Saltar</span>
		</button>
	</div>
</section>

<style>
	.timer-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		gap: 1rem;
		text-align: center;
		width: 100%;
		max-width: 100%;
		overflow: hidden;
	}

	.mode-tabs {
		display: flex;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 50px;
		padding: 0.25rem;
		gap: 0.2rem;
		width: 100%;
		max-width: 360px;
	}

	.mode-tab {
		flex: 1;
		background: transparent;
		border: none;
		border-radius: 50px;
		padding: 0.45rem 0.5rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		box-shadow: none;
		min-width: 0;
	}

	.mode-tab:hover {
		color: var(--text-primary);
		transform: none;
		box-shadow: none;
	}

	.mode-tab.active {
		background-color: var(--accent-color);
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(255, 99, 71, 0.3);
	}

	.tab-icon {
		font-size: 0.9rem;
	}

	.active-task-banner {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.85rem;
		background: var(--badge-bg);
		border: 1px solid var(--accent-color);
		border-radius: 50px;
		font-size: 0.82rem;
		color: var(--text-primary);
		max-width: 100%;
		animation: fadeIn 0.3s ease;
	}

	.active-tag {
		color: var(--accent-color);
		font-weight: 700;
	}

	.active-task-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 180px;
		min-width: 0;
	}

	.deselect-task-btn {
		background: transparent;
		border: none;
		padding: 0;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
		line-height: 1;
		margin-left: 0.2rem;
		min-height: auto;
	}

	.deselect-task-btn:hover {
		color: var(--text-primary);
		transform: none;
		box-shadow: none;
	}

	.circular-timer-container {
		position: relative;
		width: min(270px, 72vw);
		height: min(270px, 72vw);
		max-width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0.25rem 0;
	}

	.progress-ring {
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.progress-ring-track {
		stroke: var(--ring-track);
	}

	.progress-ring-indicator {
		transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
		filter: drop-shadow(0 0 8px rgba(255, 99, 71, 0.35));
	}

	.timer-center-content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		width: 80%;
	}

	.mode-badge {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
		background: var(--badge-bg);
		padding: 0.15rem 0.6rem;
		border-radius: 50px;
	}

	.timer-digits {
		font-size: clamp(2.2rem, 10vw, 3.8rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		text-shadow: 0 4px 16px var(--shadow-color);
	}

	.cycle-indicator {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.15rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.cycle-dot {
		font-size: 0.8rem;
	}

	.cycle-text {
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-weight: 600;
		margin-left: 0.2rem;
	}

	.quick-time-adjustments {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.adjust-btn {
		padding: 0.3rem 0.65rem;
		font-size: 0.82rem;
		font-weight: 700;
		background: var(--bg-secondary);
		border-radius: 8px;
		color: var(--text-secondary);
		min-height: 34px;
	}

	.adjust-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent-color);
	}

	.timer-actions {
		display: grid;
		grid-template-columns: 1fr 1.35fr 1fr;
		gap: 0.5rem;
		width: 100%;
		max-width: 360px;
		margin-top: 0.25rem;
	}

	.control-btn {
		width: 100%;
		padding: 0.65rem 0.5rem;
		border-radius: 12px;
		font-size: 0.9rem;
		font-weight: 700;
		min-height: 44px;
	}

	.control-btn.big-action {
		font-size: 1.05rem;
		border-radius: 50px;
	}

	@media (max-width: 480px) {
		.timer-section {
			gap: 0.85rem;
		}

		.btn-text {
			display: none;
		}

		.control-btn {
			padding: 0.6rem 0.3rem;
		}
	}
</style>
