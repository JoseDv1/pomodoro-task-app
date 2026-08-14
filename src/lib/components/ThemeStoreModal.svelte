<script lang="ts">
	import {
		themes,
		activeThemeId,
		setTheme,
		unlockTheme,
	} from "../stores/theme";
	import { pomodoroCount } from "../stores/timer";
	import type { Theme } from "../types";

	let {
		isOpen,
		onClose,
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	let selectedCategory = $state<string>("all");
	let feedbackMessage = $state<{ text: string; type: "success" | "error" } | null>(null);
	let messageTimeout: number | null = null;

	let filteredThemeList = $derived(
		selectedCategory === "all"
			? $themes
			: $themes.filter((t) => t.category === selectedCategory)
	);

	function showFeedback(text: string, type: "success" | "error") {
		if (messageTimeout) clearTimeout(messageTimeout);
		feedbackMessage = { text, type };
		messageTimeout = window.setTimeout(() => {
			feedbackMessage = null;
		}, 3000);
	}

	function handleSelectTheme(theme: Theme) {
		if (theme.unlocked) {
			setTheme(theme.id);
			showFeedback(`Tema "${theme.name}" aplicado con éxito`, "success");
		} else {
			handleUnlockTheme(theme);
		}
	}

	function handleUnlockTheme(theme: Theme) {
		if ($pomodoroCount < theme.price) {
			const diff = theme.price - $pomodoroCount;
			showFeedback(
				`Te faltan ${diff} 🍅 ${diff === 1 ? "tomate" : "tomates"} para desbloquear este tema. ¡Sigue concentrándote!`,
				"error"
			);
			return;
		}

		const success = unlockTheme(theme.id, $pomodoroCount);
		if (success) {
			pomodoroCount.update((c) => c - theme.price);
			showFeedback(
				`🎉 ¡Tema "${theme.name}" desbloqueado y activado!`,
				"success"
			);
		} else {
			showFeedback("Error al desbloquear el tema", "error");
		}
	}

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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal-overlay"
		onclick={handleOverlayClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="theme-store-title"
		tabindex="-1"
	>
		<div class="modal-window theme-store-window">
			<div class="modal-header">
				<div class="header-left">
					<h2 id="theme-store-title">
						<span>🛍️</span> Tienda de Temas
					</h2>
				</div>

				<div class="header-right">
					<div class="balance-pill">
						<img src="/imgs/icons/tomato.png" alt="Tomates" class="balance-icon" />
						<span class="balance-amount">{$pomodoroCount}</span>
						<span class="balance-label">disponibles</span>
					</div>
					<button class="modal-close-btn" onclick={onClose} aria-label="Cerrar modal">
						✕
					</button>
				</div>
			</div>

			<!-- Feedback Banner -->
			{#if feedbackMessage}
				<div class="feedback-banner {feedbackMessage.type}">
					{feedbackMessage.text}
				</div>
			{/if}

			<!-- Category Filter Pills -->
			<div class="category-filters" role="tablist">
				<button
					class="cat-filter-btn {selectedCategory === 'all' ? 'active' : ''}"
					onclick={() => (selectedCategory = "all")}
					role="tab"
					aria-selected={selectedCategory === "all"}
				>
					Todos ({$themes.length})
				</button>
				<button
					class="cat-filter-btn {selectedCategory === 'dark' ? 'active' : ''}"
					onclick={() => (selectedCategory = "dark")}
					role="tab"
					aria-selected={selectedCategory === "dark"}
				>
					Oscuros
				</button>
				<button
					class="cat-filter-btn {selectedCategory === 'light' ? 'active' : ''}"
					onclick={() => (selectedCategory = "light")}
					role="tab"
					aria-selected={selectedCategory === "light"}
				>
					Claros
				</button>
				<button
					class="cat-filter-btn {selectedCategory === 'colorful' ? 'active' : ''}"
					onclick={() => (selectedCategory = "colorful")}
					role="tab"
					aria-selected={selectedCategory === "colorful"}
				>
					Vibrantes
				</button>
			</div>

			<!-- Themes Grid -->
			<div class="themes-grid">
				{#each filteredThemeList as theme (theme.id)}
					{@const isActive = theme.id === $activeThemeId}
					<div
						class="theme-card {isActive ? 'is-active' : ''} {theme.unlocked ? 'is-unlocked' : 'is-locked'}"
						onclick={() => handleSelectTheme(theme)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === "Enter" && handleSelectTheme(theme)}
					>
						<!-- Palette Swatches Preview -->
						<div
							class="theme-preview-band"
							style="background-color: {theme.previewColor}"
						>
							<div class="swatches-row">
								<span
									class="swatch"
									style="background: {theme.cssProperties['--bg-primary']}"
								></span>
								<span
									class="swatch"
									style="background: {theme.cssProperties['--bg-secondary']}"
								></span>
								<span
									class="swatch"
									style="background: {theme.cssProperties['--accent-color']}"
								></span>
							</div>

							{#if isActive}
								<span class="active-badge">✓ En uso</span>
							{/if}
						</div>

						<div class="theme-card-body">
							<div class="theme-card-title-row">
								<h3 class="theme-title">{theme.name}</h3>
							</div>
							<p class="theme-description">{theme.description}</p>

							<div class="theme-card-footer">
								{#if isActive}
									<span class="theme-state-btn active-state">
										Activo
									</span>
								{:else if theme.unlocked}
									<button
										class="theme-state-btn unlocked-state"
										onclick={(e) => {
											e.stopPropagation();
											setTheme(theme.id);
										}}
									>
										Aplicar
									</button>
								{:else}
									<button
										class="theme-state-btn buy-state {$pomodoroCount >= theme.price ? 'can-afford' : 'cannot-afford'}"
										onclick={(e) => {
											e.stopPropagation();
											handleUnlockTheme(theme);
										}}
									>
										<img src="/imgs/icons/tomato.png" alt="Tomate" class="btn-tomato-img" />
										<span>{theme.price} Tomates</span>
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.theme-store-window {
		max-width: 780px;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.balance-pill {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--badge-bg);
		border: 1px solid var(--accent-color);
		padding: 0.35rem 0.8rem;
		border-radius: 50px;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.balance-icon {
		width: 18px;
		height: 18px;
	}

	.balance-amount {
		color: var(--accent-color);
		font-size: 1rem;
	}

	.balance-label {
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.feedback-banner {
		padding: 0.75rem 1rem;
		border-radius: 10px;
		margin-bottom: 1rem;
		font-size: 0.88rem;
		font-weight: 600;
		text-align: center;
		animation: fadeIn 0.2s ease;
	}

	.feedback-banner.success {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.feedback-banner.error {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.category-filters {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 1.25rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}

	.cat-filter-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 50px;
		padding: 0.35rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		box-shadow: none;
	}

	.cat-filter-btn:hover {
		color: var(--text-primary);
		transform: none;
		box-shadow: none;
	}

	.cat-filter-btn.active {
		background: var(--accent-color);
		color: #ffffff;
		border-color: var(--accent-color);
	}

	.themes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 0.75rem;
	}

	.theme-card {
		background: var(--bg-secondary);
		border: 2px solid var(--border-color);
		border-radius: 14px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
	}

	.theme-card:hover {
		transform: translateY(-4px);
		border-color: var(--accent-color);
		box-shadow: 0 8px 24px var(--shadow-color);
	}

	.theme-card.is-active {
		border-color: var(--accent-color);
		box-shadow: 0 0 0 2px var(--accent-color);
	}

	.theme-preview-band {
		height: 70px;
		width: 100%;
		padding: 0.75rem;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		position: relative;
	}

	.swatches-row {
		display: flex;
		gap: 0.35rem;
	}

	.swatch {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.6);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
	}

	.active-badge {
		font-size: 0.72rem;
		font-weight: 700;
		background: rgba(0, 0, 0, 0.65);
		color: #ffffff;
		padding: 0.2rem 0.55rem;
		border-radius: 50px;
		backdrop-filter: blur(4px);
	}

	.theme-card-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0.4rem;
	}

	.theme-title {
		font-size: 1rem;
		font-weight: 700;
	}

	.theme-description {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.35;
		flex: 1;
	}

	.theme-card-footer {
		margin-top: 0.75rem;
	}

	.theme-state-btn {
		width: 100%;
		padding: 0.5rem;
		border-radius: 8px;
		font-size: 0.82rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.theme-state-btn.active-state {
		background: var(--badge-bg);
		color: var(--accent-color);
		border: 1px solid var(--accent-color);
	}

	.theme-state-btn.unlocked-state {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.theme-state-btn.buy-state.can-afford {
		background: var(--accent-color);
		color: #ffffff;
		border: none;
	}

	.theme-state-btn.buy-state.cannot-afford {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		opacity: 0.85;
	}

	.btn-tomato-img {
		width: 15px;
		height: 15px;
	}
</style>
