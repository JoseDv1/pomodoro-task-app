<script lang="ts">
	import { settings } from "../stores/settings";
	import { deferredInstallPrompt, isAppInstalled, promptInstallApp } from "../stores/pwa";

	let {
		onOpenSettings,
		onOpenThemeStore,
		onOpenStats,
		onOpenAmbient,
	}: {
		onOpenSettings: () => void;
		onOpenThemeStore: () => void;
		onOpenStats: () => void;
		onOpenAmbient: () => void;
	} = $props();

	let isAmbientActive = $derived($settings.ambientSound !== "off");
</script>

<nav class="mobile-bottom-nav" aria-label="Navegación móvil inferior">
	<!-- Ambient Sound Button -->
	<button
		class="nav-tab {isAmbientActive ? 'active' : ''}"
		onclick={onOpenAmbient}
		aria-label="Sonidos relajantes de fondo"
	>
		<div class="nav-icon-wrapper">
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
				<path d="M9 18V5l12-2v13"></path>
				<circle cx="6" cy="18" r="3"></circle>
				<circle cx="18" cy="16" r="3"></circle>
			</svg>
			{#if isAmbientActive}
				<span class="nav-indicator"></span>
			{/if}
		</div>
		<span class="nav-label">Sonidos</span>
	</button>

	<!-- Stats Button -->
	<button
		class="nav-tab"
		onclick={onOpenStats}
		aria-label="Estadísticas de productividad"
	>
		<div class="nav-icon-wrapper">
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
				<line x1="18" y1="20" x2="18" y2="10"></line>
				<line x1="12" y1="20" x2="12" y2="4"></line>
				<line x1="6" y1="20" x2="6" y2="14"></line>
			</svg>
		</div>
		<span class="nav-label">Estadísticas</span>
	</button>

	<!-- Theme Store Button -->
	<button
		class="nav-tab"
		onclick={onOpenThemeStore}
		aria-label="Tienda de temas personalizados"
	>
		<div class="nav-icon-wrapper">
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
				<circle cx="12" cy="12" r="10"></circle>
				<path
					d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
				></path>
			</svg>
		</div>
		<span class="nav-label">Temas</span>
	</button>

	<!-- Settings Button -->
	<button
		class="nav-tab"
		onclick={onOpenSettings}
		aria-label="Configuración de la aplicación"
	>
		<div class="nav-icon-wrapper">
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
				<circle cx="12" cy="12" r="3"></circle>
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
				></path>
			</svg>
		</div>
		<span class="nav-label">Ajustes</span>
	</button>

	<!-- Optional Install Button -->
	{#if $deferredInstallPrompt && !$isAppInstalled}
		<button
			class="nav-tab install-tab"
			onclick={promptInstallApp}
			aria-label="Instalar app en el dispositivo"
		>
			<div class="nav-icon-wrapper">
				<span class="install-emoji">📲</span>
			</div>
			<span class="nav-label">Instalar</span>
		</button>
	{/if}
</nav>

<style>
	.mobile-bottom-nav {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: var(--card-bg);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid var(--border-color);
		padding: 0.4rem 0.5rem max(0.4rem, env(safe-area-inset-bottom)) 0.5rem;
		z-index: 999;
		justify-content: space-around;
		align-items: center;
		box-shadow: 0 -4px 20px var(--shadow-color);
	}

	.nav-tab {
		background: transparent;
		border: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		padding: 0.35rem 0.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		border-radius: 8px;
		flex: 1;
		min-height: 48px;
		box-shadow: none;
		transition: color 0.2s ease, transform 0.15s ease;
	}

	.nav-tab:hover,
	.nav-tab:active {
		color: var(--text-primary);
		transform: translateY(-1px);
		background: transparent;
		box-shadow: none;
	}

	.nav-tab.active {
		color: var(--accent-color);
	}

	.nav-icon-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.nav-indicator {
		position: absolute;
		top: -2px;
		right: -3px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: var(--accent-color);
		box-shadow: 0 0 6px var(--accent-color);
		animation: pulseGlow 1.5s infinite ease-in-out;
	}

	.install-emoji {
		font-size: 1.1rem;
		line-height: 1;
	}

	.install-tab {
		color: #38bdf8;
	}

	@media (max-width: 768px) {
		.mobile-bottom-nav {
			display: flex;
		}
	}
</style>
