<script lang="ts">
	import {
		themes,
		activeThemeId,
		setTheme,
		unlockTheme,
	} from "../stores/theme";
	import { pomodoroCount } from "../stores/timer";
	import type { Theme } from "../stores/theme";
	import { onMount } from "svelte";

	let showStore = false;
	let purchaseMessage = "";
	let messageType = "";
	let messageTimeout: number | null = null;

	function toggleThemeStore() {
		showStore = !showStore;
	}

	function selectTheme(theme: Theme) {
		if (theme.unlocked) {
			setTheme(theme.id);
			showMessage(`Tema "${theme.name}" activado`, "success");
		} else {
			attemptPurchase(theme);
		}
	}

	function attemptPurchase(theme: Theme) {
		if ($pomodoroCount < theme.price) {
			showMessage(
				`Necesitas ${theme.price - $pomodoroCount} pomodoros más para desbloquear este tema`,
				"error"
			);
			return;
		}

		const success = unlockTheme(theme.id);
		if (success) {
			// Restar los pomodoros utilizados
			pomodoroCount.update((count) => count - theme.price);
			showMessage(`¡Has desbloqueado el tema "${theme.name}"!`, "success");

			// Aplicar automáticamente el tema recién desbloqueado
			setTheme(theme.id);
		} else {
			showMessage(
				"No se pudo desbloquear el tema. Inténtalo de nuevo.",
				"error"
			);
		}
	}

	function showMessage(message: string, type: "success" | "error") {
		purchaseMessage = message;
		messageType = type;

		if (messageTimeout !== null) {
			clearTimeout(messageTimeout);
		}

		messageTimeout = window.setTimeout(() => {
			purchaseMessage = "";
			messageTimeout = null;
		}, 3000);
	}

	// Función para manejar la tecla Escape
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && showStore) {
			toggleThemeStore();
		}
	}

	onMount(() => {
		// Añadir listener de teclado cuando se monta el componente
		window.addEventListener("keydown", handleKeydown);

		return () => {
			// Limpiar el timeout del mensaje y el listener de teclado cuando se desmonta
			if (messageTimeout !== null) {
				clearTimeout(messageTimeout);
			}
			window.removeEventListener("keydown", handleKeydown);
		};
	});
</script>

<button
	class="theme-store-toggle"
	on:click={toggleThemeStore}
	aria-label="Abrir tienda de temas"
	aria-expanded={showStore}
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
		><circle cx="12" cy="12" r="10"></circle><path
			d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
		></path></svg
	>
	<span>Tienda de Temas</span>
</button>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
{#if showStore}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="theme-store-overlay"
		on:click={toggleThemeStore}
		role="dialog"
		aria-modal="true"
		aria-labelledby="theme-store-title"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="theme-store-modal" on:click|stopPropagation tabindex="-1">
			<header>
				<h2 id="theme-store-title">Tienda de Temas</h2>
				<div class="pomodoro-balance">
					<img src="/imgs/icons/tomato.png" alt="Pomodoro" />
					<span>{$pomodoroCount}</span>
				</div>
				<button class="close-button" on:click={toggleThemeStore}>×</button>
			</header>

			{#if purchaseMessage}
				<div class="message {messageType}">
					{purchaseMessage}
				</div>
			{/if}

			<div class="themes-grid">
				{#each $themes as theme (theme.id)}
					<div
						class="theme-card {theme.id === $activeThemeId ? 'active' : ''}"
						on:click={() => selectTheme(theme)}
					>
						<div
							class="theme-preview"
							style="background-color: {theme.previewColor}"
						></div>
						<div class="theme-info">
							<h3>{theme.name}</h3>
							<p>{theme.description}</p>
							{#if theme.unlocked}
								{#if theme.id === $activeThemeId}
									<span class="theme-status active">Activo</span>
								{:else}
									<span class="theme-status unlocked">Desbloqueado</span>
								{/if}
							{:else}
								<div class="theme-price">
									<img src="/imgs/icons/tomato.png" alt="Pomodoro" />
									<span>{theme.price}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.theme-store-toggle {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		background-color: var(--accent-color);
		color: white;
		border: none;
		padding: 0.6rem 1rem;
		border-radius: 50px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		z-index: 1000;
		font-weight: bold;
		box-shadow: 0 2px 8px var(--shadow-color);
		transition: all 0.3s ease;
	}

	.theme-store-toggle:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--shadow-color);
	}

	.theme-store-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		backdrop-filter: blur(4px);
	}

	.theme-store-modal {
		background-color: var(--bg-primary);
		border-radius: 8px;
		width: 90%;
		max-width: 800px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		padding: 1.5rem;
		color: var(--text-primary);
		position: relative;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	h2 {
		margin: 0;
		font-size: 1.8rem;
		color: var(--text-primary);
	}

	.pomodoro-balance {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--bg-secondary);
		padding: 0.5rem 1rem;
		border-radius: 50px;
	}

	.pomodoro-balance img {
		width: 1.5rem;
		height: 1.5rem;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: var(--text-primary);
		padding: 0.2rem 0.5rem;
		line-height: 1;
	}

	.themes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.theme-card {
		background-color: var(--bg-secondary);
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.3s ease;
		cursor: pointer;
		position: relative;
		border: 2px solid transparent;
	}

	.theme-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 5px 15px var(--shadow-color);
	}

	.theme-card.active {
		border-color: var(--accent-color);
	}

	.theme-preview {
		height: 100px;
		width: 100%;
	}

	.theme-info {
		padding: 1rem;
	}

	.theme-info h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
		color: var(--text-primary);
	}

	.theme-info p {
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.theme-status {
		display: inline-block;
		padding: 0.3rem 0.8rem;
		border-radius: 50px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.theme-status.active {
		background-color: var(--accent-color);
		color: white;
	}

	.theme-status.unlocked {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.theme-price {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-weight: bold;
	}

	.theme-price img {
		width: 1.2rem;
		height: 1.2rem;
	}

	.message {
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		text-align: center;
		animation: fadeIn 0.3s ease;
	}

	.message.success {
		background-color: rgba(39, 174, 96, 0.2);
		color: #27ae60;
	}

	.message.error {
		background-color: rgba(231, 76, 60, 0.2);
		color: #e74c3c;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 600px) {
		.theme-store-modal {
			width: 95%;
			padding: 1rem;
		}

		.themes-grid {
			grid-template-columns: 1fr;
		}

		.theme-store-toggle span {
			display: none;
		}
	}
</style>
