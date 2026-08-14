<script lang="ts">
	import { stats, todayStats, weeklyActivity } from "../stores/stats";
	import { taskStats } from "../stores/task";

	let {
		isOpen,
		onClose,
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onClose();
		}
	}

	let totalHours = $derived(Math.floor($stats.totalFocusMinutes / 60));
	let totalMinutesRem = $derived($stats.totalFocusMinutes % 60);

	let todayHours = $derived(Math.floor($todayStats.minutes / 60));
	let todayMinutesRem = $derived($todayStats.minutes % 60);

	let maxDayMinutes = $derived(
		Math.max(60, ...$weeklyActivity.map((d) => d.minutes))
	);

	// Achievements checks
	let achievements = $derived([
		{
			id: "first_pomo",
			title: "Primer Paso",
			desc: "Completa tu primera sesión de enfoque",
			icon: "🌱",
			unlocked: $stats.totalPomodoros >= 1,
		},
		{
			id: "ten_pomo",
			title: "Enfoque Imparable",
			desc: "Completa 10 sesiones de Pomodoro",
			icon: "🍅",
			unlocked: $stats.totalPomodoros >= 10,
		},
		{
			id: "streak_3",
			title: "Racha de Fuego",
			desc: "Mantén una racha de 3 días consecutivos",
			icon: "🔥",
			unlocked: $stats.bestStreak >= 3,
		},
		{
			id: "streak_7",
			title: "Hábito de Hierro",
			desc: "Alcanza 7 días de productividad",
			icon: "👑",
			unlocked: $stats.bestStreak >= 7,
		},
		{
			id: "tasks_done",
			title: "Ejecutor Maestro",
			desc: "Completa 5 tareas de tu lista",
			icon: "⚡",
			unlocked: $taskStats.completed >= 5,
		},
	]);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal-overlay"
		onclick={handleOverlayClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="stats-modal-title"
		tabindex="-1"
	>
		<div class="modal-window stats-window">
			<div class="modal-header">
				<h2 id="stats-modal-title">
					<span>📊</span> Estadísticas y Rendimiento
				</h2>
				<button class="modal-close-btn" onclick={onClose} aria-label="Cerrar modal">
					✕
				</button>
			</div>

			<div class="stats-content">
				<!-- Stat Cards Grid -->
				<div class="stat-cards-grid">
					<div class="stat-card">
						<span class="card-icon">⏱️</span>
						<div class="card-info">
							<span class="stat-value">
								{#if totalHours > 0}
									{totalHours}h {totalMinutesRem}m
								{:else}
									{$stats.totalFocusMinutes}m
								{/if}
							</span>
							<span class="stat-label">Tiempo Total de Enfoque</span>
						</div>
					</div>

					<div class="stat-card">
						<span class="card-icon">🍅</span>
						<div class="card-info">
							<span class="stat-value">{$stats.totalPomodoros}</span>
							<span class="stat-label">Pomodoros Totales</span>
						</div>
					</div>

					<div class="stat-card">
						<span class="card-icon">🔥</span>
						<div class="card-info">
							<span class="stat-value">{$stats.currentStreak} <small>días</small></span>
							<span class="stat-label">Racha Actual (Mejor: {$stats.bestStreak})</span>
						</div>
					</div>

					<div class="stat-card">
						<span class="card-icon">🎯</span>
						<div class="card-info">
							<span class="stat-value">
								{#if todayHours > 0}
									{todayHours}h {todayMinutesRem}m
								{:else}
									{$todayStats.minutes}m
								{/if}
							</span>
							<span class="stat-label">Enfoque de Hoy ({$todayStats.pomodoros} 🍅)</span>
						</div>
					</div>
				</div>

				<!-- Weekly Activity Visual Chart -->
				<div class="weekly-chart-box">
					<h3 class="box-title">📅 Actividad de los Últimos 7 Días</h3>
					
					<div class="bar-chart">
						{#each $weeklyActivity as day}
							{@const heightPct = Math.round((day.minutes / maxDayMinutes) * 100)}
							<div class="bar-column">
								<span class="bar-value-tooltip">{day.minutes}m</span>
								<div class="bar-track">
									<div
										class="bar-fill {day.minutes > 0 ? 'active' : ''}"
										style="height: {Math.max(day.minutes > 0 ? 8 : 2, heightPct)}%"
									></div>
								</div>
								<span class="bar-day-label">{day.label}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Achievements Grid -->
				<div class="achievements-box">
					<h3 class="box-title">🏆 Logros & Hitos</h3>

					<div class="achievements-grid">
						{#each achievements as ach}
							<div class="achievement-card {ach.unlocked ? 'unlocked' : 'locked'}">
								<span class="ach-icon">{ach.icon}</span>
								<div class="ach-info">
									<h4 class="ach-title">{ach.title}</h4>
									<p class="ach-desc">{ach.desc}</p>
								</div>
								<span class="ach-status">
									{ach.unlocked ? "✓ Conseguido" : "Bloqueado"}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.stats-window {
		max-width: 680px;
	}

	.stats-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.stat-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.85rem;
	}

	.stat-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 14px;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.card-icon {
		font-size: 1.8rem;
	}

	.card-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.stat-value small {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.stat-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-top: 0.2rem;
	}

	.weekly-chart-box,
	.achievements-box {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 14px;
		padding: 1.25rem;
	}

	.box-title {
		font-size: 0.95rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.bar-chart {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		height: 140px;
		padding-top: 1.5rem;
		gap: 0.5rem;
	}

	.bar-column {
		flex: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.4rem;
	}

	.bar-value-tooltip {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.bar-track {
		width: 100%;
		max-width: 32px;
		height: 100%;
		background: var(--bg-tertiary);
		border-radius: 6px;
		display: flex;
		align-items: flex-end;
		overflow: hidden;
	}

	.bar-fill {
		width: 100%;
		background: var(--border-color);
		border-radius: 6px;
		transition: height 0.5s ease;
	}

	.bar-fill.active {
		background: linear-gradient(180deg, var(--accent-hover), var(--accent-color));
	}

	.bar-day-label {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.achievements-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 0.75rem;
	}

	.achievement-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg-primary);
	}

	.achievement-card.locked {
		opacity: 0.5;
	}

	.achievement-card.unlocked {
		border-color: rgba(245, 158, 11, 0.4);
		background: linear-gradient(90deg, rgba(245, 158, 11, 0.08), transparent);
	}

	.ach-icon {
		font-size: 1.6rem;
	}

	.ach-info {
		flex: 1;
		min-width: 0;
	}

	.ach-title {
		font-size: 0.85rem;
		font-weight: 700;
	}

	.ach-desc {
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.ach-status {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--accent-color);
	}
</style>
