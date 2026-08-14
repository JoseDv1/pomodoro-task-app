<script lang="ts">
	import {
		mode,
		duration,
		timeLeft,
		isRunning,
		cycleCount,
		timerDisplay,
		progress,
		modeLabel,
		isWorking,
		switchMode,
		toggleTimer,
		skipTimer,
		resetTimer,
		addSeconds,
	} from "../stores/timer";
	import { settings } from "../stores/settings";
	import { activeTask, setActiveTask } from "../stores/task";

	// SVG circle parameters
	const radius = 135;
	const circumference = 2 * Math.PI * radius;
	let strokeOffset = $derived(
		circumference - ($progress / 100) * circumference
	);

	let longBreakInterval = $derived($settings.longBreakInterval || 4);
</script>

<section class="timer-section glass-card">
	<!-- Mode Switcher Tabs -->
	<div class="mode-tabs" role="tablist">
		<button
			class="mode-tab {$mode === 'work' ? 'active' : ''}"
			onclick={() => switchMode("work")}
			role="tab"
			aria-selected={$mode === "work"}
		>
			<span class="tab-icon">🍅</span>
			<span>Enfoque</span>
		</button>
		<button
			class="mode-tab {$mode === 'shortBreak' ? 'active' : ''}"
			onclick={() => switchMode("shortBreak")}
			role="tab"
			aria-selected={$mode === "shortBreak"}
		>
			<span class="tab-icon">☕</span>
			<span>Descanso Corto</span>
		</button>
		<button
			class="mode-tab {$mode === 'longBreak' ? 'active' : ''}"
			onclick={() => switchMode("longBreak")}
			role="tab"
			aria-selected={$mode === "longBreak"}
		>
			<span class="tab-icon">🌴</span>
			<span>Descanso Largo</span>
		</button>
	</div>

	<!-- Active Task Banner -->
	{#if $activeTask}
		<div class="active-task-banner" title="Tarea activa para esta sesión">
			<span class="active-tag">🎯 Enfocado en:</span>
			<span class="active-task-name">{$activeTask.name}</span>
			<button
				class="deselect-task-btn"
				onclick={() => setActiveTask(null)}
				title="Desvincular tarea"
				aria-label="Desvincular tarea actual"
			>
				✕
			</button>
		</div>
	{/if}

	<!-- Circular Progress Timer Visualization -->
	<div class="circular-timer-container">
		<svg class="progress-ring" viewBox="0 0 320 320" width="300" height="300">
			<defs>
				<linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="var(--accent-color)" />
					<stop offset="100%" stop-color="var(--accent-hover)" />
				</linearGradient>
			</defs>

			<!-- Background Track -->
			<circle
				class="progress-ring-track"
				cx="160"
				cy="160"
				r={radius}
				fill="transparent"
				stroke-width="12"
			/>

			<!-- Animated Progress Indicator -->
			<circle
				class="progress-ring-indicator {$isRunning ? 'pulsing' : ''}"
				cx="160"
				cy="160"
				r={radius}
				fill="transparent"
				stroke="url(#timerGradient)"
				stroke-width="12"
				stroke-dasharray={circumference}
				stroke-dashoffset={strokeOffset}
				stroke-linecap="round"
			/>
		</svg>

		<!-- Center Content inside Timer Ring -->
		<div class="timer-center-content">
			<span class="mode-badge">{$modeLabel}</span>
			<div class="timer-digits">{$timerDisplay}</div>
			<div class="cycle-indicator" title="Progreso del ciclo de 4 sesiones">
				{#each Array(longBreakInterval) as _, i}
					<span
						class="cycle-dot {i + 1 < $cycleCount
							? 'completed'
							: i + 1 === $cycleCount && $isWorking
								? 'current'
								: ''}"
					>
						{i + 1 <= $cycleCount && $isWorking ? "🍅" : "⚪"}
					</span>
				{/each}
				<span class="cycle-text">
					{$isWorking
						? `Sesión ${$cycleCount} de ${longBreakInterval}`
						: "Descanso"}
				</span>
			</div>
		</div>
	</div>

	<!-- Quick Adjustment Buttons -->
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
				width="20"
				height="20"
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
			<span>Reiniciar</span>
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
					width="26"
					height="26"
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
					width="26"
					height="26"
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
				width="20"
				height="20"
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
			<span>Saltar</span>
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
		gap: 1.25rem;
		text-align: center;
	}

	.mode-tabs {
		display: flex;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 50px;
		padding: 0.35rem;
		gap: 0.25rem;
		max-width: 100%;
		overflow-x: auto;
	}

	.mode-tab {
		background: transparent;
		border: none;
		border-radius: 50px;
		padding: 0.5rem 1rem;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		box-shadow: none;
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
		font-size: 1rem;
	}

	.active-task-banner {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 1rem;
		background: var(--badge-bg);
		border: 1px solid var(--accent-color);
		border-radius: 50px;
		font-size: 0.85rem;
		color: var(--text-primary);
		max-width: 90%;
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
		max-width: 250px;
	}

	.deselect-task-btn {
		background: transparent;
		border: none;
		padding: 0;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		margin-left: 0.25rem;
	}

	.deselect-task-btn:hover {
		color: var(--text-primary);
		transform: none;
		box-shadow: none;
	}

	.circular-timer-container {
		position: relative;
		width: 300px;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0.5rem 0;
	}

	.progress-ring {
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
		position: absolute;
		top: 0;
		left: 0;
	}

	.progress-ring-track {
		stroke: var(--ring-track);
	}

	.progress-ring-indicator {
		transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
		filter: drop-shadow(0 0 10px rgba(255, 99, 71, 0.35));
	}

	.timer-center-content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.mode-badge {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
		color: var(--accent-color);
		background: var(--badge-bg);
		padding: 0.2rem 0.75rem;
		border-radius: 50px;
	}

	.timer-digits {
		font-size: clamp(2.6rem, 11vw, 4rem);
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
		gap: 0.3rem;
		margin-top: 0.2rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.cycle-dot {
		font-size: 0.85rem;
	}

	.cycle-text {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-weight: 600;
		margin-left: 0.3rem;
	}

	.quick-time-adjustments {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.adjust-btn {
		padding: 0.35rem 0.75rem;
		font-size: 0.85rem;
		font-weight: 700;
		background: var(--bg-secondary);
		border-radius: 8px;
		color: var(--text-secondary);
		min-height: 36px;
	}

	.adjust-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent-color);
	}

	.timer-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		max-width: 400px;
		margin-top: 0.5rem;
	}

	.control-btn {
		flex: 1;
		padding: 0.75rem 1.1rem;
		border-radius: 14px;
		font-size: 0.95rem;
		font-weight: 700;
		min-height: 48px;
	}

	.control-btn.big-action {
		flex: 1.4;
		padding: 0.85rem 1.6rem;
		font-size: 1.1rem;
		border-radius: 50px;
	}

	@media (max-width: 480px) {
		.circular-timer-container {
			width: min(260px, 75vw);
			height: min(260px, 75vw);
		}

		.progress-ring {
			width: 100%;
			height: 100%;
		}

		.mode-tabs {
			width: 100%;
			justify-content: center;
		}

		.mode-tab {
			padding: 0.4rem 0.7rem;
			font-size: 0.8rem;
		}

		.control-btn {
			padding: 0.65rem 0.75rem;
			font-size: 0.88rem;
			min-height: 46px;
		}

		.control-btn.big-action {
			padding: 0.75rem 1.1rem;
			font-size: 1rem;
		}
	}
</style>
