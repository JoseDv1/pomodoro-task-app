<script lang="ts">
	import { pomodoroCount } from "../stores/timer";
	import { stats } from "../stores/stats";
	import { settings } from "../stores/settings";
	import { deferredInstallPrompt, isAppInstalled, promptInstallApp } from "../stores/pwa";

	let {
		onOpenSettings,
		onOpenThemeStore,
		onOpenStats,
		onOpenAmbient,
		onOpenShortcuts,
	}: {
		onOpenSettings: () => void;
		onOpenThemeStore: () => void;
		onOpenStats: () => void;
		onOpenAmbient: () => void;
		onOpenShortcuts: () => void;
	} = $props();

	let isAmbientActive = $derived($settings.ambientSound !== "off");
</script>

<header class="app-header">
	<div class="header-top-row">
		<div class="header-brand">
			<div class="logo-wrapper">
				<img src="/imgs/icons/tomato.png" alt="Tomatito" class="brand-logo" />
			</div>
			<div class="brand-text">
				<h1 class="brand-title">Pomodoro<span class="accent">Focus</span></h1>
				<span class="brand-subtitle">Gestión de Tiempo & Tareas</span>
			</div>
		</div>

		<!-- Status Badges (Streak & Tomato) -->
		<div class="header-badges">
			<!-- Streak Pill -->
			<button
				class="pill-badge streak-pill"
				onclick={onOpenStats}
				title="Racha de productividad diaria"
				aria-label="Ver estadísticas y racha diaria"
			>
				<span class="pill-icon">🔥</span>
				<span class="pill-text">{$stats.currentStreak}d</span>
			</button>

			<!-- Tomato Balance Pill -->
			<button
				class="pill-badge tomato-pill"
				onclick={onOpenThemeStore}
				title="Tomates acumulados. ¡Úsalos en la Tienda!"
				aria-label="Abrir tienda de temas"
			>
				<img src="/imgs/icons/tomato.png" alt="Pomodoro" class="pill-tomato-img" />
				<span class="pill-count">{$pomodoroCount}</span>
			</button>
		</div>
	</div>

	<!-- Action Controls -->
	<div class="header-actions">
		<!-- PWA Install Button (Mobile & Desktop) -->
		{#if $deferredInstallPrompt && !$isAppInstalled}
			<button
				class="pill-badge install-pill"
				onclick={promptInstallApp}
				title="Instalar Pomodoro Focus en tu dispositivo"
				aria-label="Instalar aplicación"
			>
				<span>📲</span>
				<span class="install-text">Instalar</span>
			</button>
		{/if}

		<!-- Ambient Sound Button -->
		<button
			class="icon-btn {isAmbientActive ? 'active' : ''}"
			onclick={onOpenAmbient}
			title="Sonidos de fondo relajantes"
			aria-label="Configurar sonidos de fondo"
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
				<path d="M9 18V5l12-2v13"></path>
				<circle cx="6" cy="18" r="3"></circle>
				<circle cx="18" cy="16" r="3"></circle>
			</svg>
			{#if isAmbientActive}
				<span class="sound-indicator"></span>
			{/if}
		</button>

		<!-- Stats Button -->
		<button
			class="icon-btn"
			onclick={onOpenStats}
			title="Estadísticas de enfoque"
			aria-label="Ver estadísticas"
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
				<line x1="18" y1="20" x2="18" y2="10"></line>
				<line x1="12" y1="20" x2="12" y2="4"></line>
				<line x1="6" y1="20" x2="6" y2="14"></line>
			</svg>
		</button>

		<!-- Theme Store Button -->
		<button
			class="icon-btn"
			onclick={onOpenThemeStore}
			title="Tienda de Temas"
			aria-label="Abrir tienda de temas"
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
				<circle cx="12" cy="12" r="10"></circle>
				<path
					d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
				></path>
			</svg>
		</button>

		<!-- Settings Button -->
		<button
			class="icon-btn"
			onclick={onOpenSettings}
			title="Configuración"
			aria-label="Abrir configuración"
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
				<circle cx="12" cy="12" r="3"></circle>
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
				></path>
			</svg>
		</button>

		<!-- Shortcuts Button -->
		<button
			class="icon-btn shortcut-btn"
			onclick={onOpenShortcuts}
			title="Atajos de teclado (?)"
			aria-label="Ver atajos de teclado"
		>
			<span class="shortcut-icon">?</span>
		</button>
	</div>
</header>

<style>
	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: max(0.75rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) 0.75rem max(1rem, env(safe-area-inset-left));
		background-color: var(--card-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: 100;
		gap: 0.75rem;
		width: 100%;
		max-width: 100%;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
	}

	.logo-wrapper {
		width: 36px;
		height: 36px;
		min-width: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--badge-bg);
		border-radius: 10px;
		border: 1px solid var(--border-color);
		box-shadow: 0 4px 12px var(--shadow-color);
	}

	.brand-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		animation: bounceSlow 3s ease-in-out infinite;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		text-align: left;
		min-width: 0;
	}

	.brand-title {
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.brand-title .accent {
		color: var(--accent-color);
		margin-left: 1px;
	}

	.brand-subtitle {
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-weight: 500;
		white-space: nowrap;
	}

	.header-badges {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.pill-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		border-radius: 50px;
		font-size: 0.82rem;
		font-weight: 700;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 32px;
		white-space: nowrap;
	}

	.pill-badge:hover {
		border-color: var(--accent-color);
		transform: translateY(-1px);
	}

	.install-pill {
		background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(99, 102, 241, 0.18));
		border-color: rgba(56, 189, 248, 0.4);
		color: var(--text-primary);
		animation: pulseGlow 2.5s infinite ease-in-out;
	}

	.streak-pill {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.12));
		border-color: rgba(245, 158, 11, 0.3);
	}

	.pill-icon {
		font-size: 0.9rem;
	}

	.tomato-pill {
		background: var(--badge-bg);
		border-color: rgba(255, 99, 71, 0.3);
	}

	.pill-tomato-img {
		width: 16px;
		height: 16px;
	}

	.icon-btn {
		width: 34px;
		height: 34px;
		min-width: 34px;
		padding: 0;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--button-bg);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		position: relative;
	}

	.icon-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent-color);
		background-color: var(--button-hover);
	}

	.icon-btn.active {
		color: var(--accent-color);
		border-color: var(--accent-color);
		background-color: var(--badge-bg);
	}

	.sound-indicator {
		position: absolute;
		top: 5px;
		right: 5px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: var(--accent-color);
		box-shadow: 0 0 6px var(--accent-color);
		animation: pulseGlow 1.5s infinite ease-in-out;
	}

	.shortcut-icon {
		font-size: 0.9rem;
		font-weight: 700;
	}

	@media (max-width: 640px) {
		.app-header {
			padding: max(0.5rem, env(safe-area-inset-top)) 0.6rem 0.5rem 0.6rem;
			gap: 0.4rem;
		}

		.brand-subtitle {
			display: none;
		}

		.brand-title {
			font-size: 1.05rem;
		}

		.header-top-row {
			flex: 1;
			justify-content: space-between;
			min-width: 0;
		}

		.install-text {
			display: none;
		}

		.shortcut-btn {
			display: none;
		}
	}

	@media (max-width: 420px) {
		.brand-title span.accent {
			display: inline;
		}

		.pill-badge {
			padding: 0.25rem 0.45rem;
			font-size: 0.76rem;
			min-height: 28px;
		}

		.icon-btn {
			width: 32px;
			height: 32px;
			min-width: 32px;
			border-radius: 8px;
		}
	}
</style>
