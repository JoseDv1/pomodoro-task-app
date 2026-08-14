<script lang="ts">
	import { settings, updateSettings } from "../stores/settings";
	import type { AmbientSoundId } from "../types";

	let {
		isOpen,
		onClose,
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	const ambientOptions: { id: AmbientSoundId; name: string; desc: string; icon: string }[] = [
		{
			id: "off",
			name: "Sin sonido de fondo",
			desc: "Silencio total para concentrarte",
			icon: "🔇",
		},
		{
			id: "rain",
			name: "Lluvia Relajante",
			desc: "Suave caída de lluvia natural sintetizada",
			icon: "🌧️",
		},
		{
			id: "whitenoise",
			name: "Ruido Blanco",
			desc: "Frecuencia plana para aislar ruidos molestos",
			icon: "📻",
		},
		{
			id: "brownnoise",
			name: "Ruido Marrón",
			desc: "Graves profundos ideales para TDAH y máxima inmersión",
			icon: "🌊",
		},
		{
			id: "stream",
			name: "Río de Bosque",
			desc: "Corriente de agua fluyendo en la naturaleza",
			icon: "🌲",
		},
	];

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
		aria-labelledby="ambient-modal-title"
		tabindex="-1"
	>
		<div class="modal-window ambient-window">
			<div class="modal-header">
				<h2 id="ambient-modal-title">
					<span>🎵</span> Sonidos de Fondo Relajantes
				</h2>
				<button class="modal-close-btn" onclick={onClose} aria-label="Cerrar modal">
					✕
				</button>
			</div>

			<div class="ambient-content">
				<p class="ambient-intro">
					Los sonidos de fondo procesados con Web Audio te ayudan a enmascarar distracciones y entrar en estado de flujo mental.
				</p>

				<!-- Volume Slider -->
				<div class="volume-control-box">
					<label for="ambient-vol-slider">
						Volumen de ambiente: {Math.round($settings.ambientVolume * 100)}%
					</label>
					<input
						id="ambient-vol-slider"
						type="range"
						min="0.05"
						max="1"
						step="0.05"
						value={$settings.ambientVolume}
						oninput={(e) =>
							updateSettings({
								ambientVolume: parseFloat(
									(e.target as HTMLInputElement).value
								),
							})}
						class="ambient-range"
					/>
				</div>

				<!-- Options List -->
				<div class="ambient-grid">
					{#each ambientOptions as option}
						{@const isSelected = $settings.ambientSound === option.id}
						<button
							class="ambient-card {isSelected ? 'active' : ''}"
							onclick={() => updateSettings({ ambientSound: option.id })}
						>
							<span class="ambient-icon">{option.icon}</span>
							<div class="ambient-info">
								<h3 class="ambient-name">{option.name}</h3>
								<p class="ambient-desc">{option.desc}</p>
							</div>
							{#if isSelected}
								<span class="playing-indicator">
									{#if option.id !== 'off'}
										<span class="wave"></span>
										<span class="wave"></span>
										<span class="wave"></span>
									{:else}
										✓
									{/if}
								</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="modal-footer">
				<button class="primary" onclick={onClose}>
					Listo
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.ambient-window {
		max-width: 540px;
	}

	.ambient-content {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.ambient-intro {
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.volume-control-box {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.volume-control-box label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.ambient-range {
		width: 100%;
		accent-color: var(--accent-color);
		cursor: pointer;
	}

	.ambient-grid {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.ambient-card {
		display: flex;
		align-items: center;
		padding: 0.85rem 1rem;
		background: var(--bg-secondary);
		border: 2px solid var(--border-color);
		border-radius: 12px;
		gap: 0.85rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.ambient-card:hover {
		border-color: var(--accent-color);
		transform: translateY(-2px);
	}

	.ambient-card.active {
		border-color: var(--accent-color);
		background: linear-gradient(90deg, var(--badge-bg), var(--bg-secondary));
	}

	.ambient-icon {
		font-size: 1.8rem;
	}

	.ambient-info {
		flex: 1;
		min-width: 0;
	}

	.ambient-name {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.ambient-desc {
		font-size: 0.78rem;
		color: var(--text-secondary);
		margin-top: 0.15rem;
	}

	.playing-indicator {
		display: flex;
		align-items: center;
		gap: 3px;
		color: var(--accent-color);
		font-weight: 800;
	}

	.wave {
		display: inline-block;
		width: 3px;
		height: 14px;
		background: var(--accent-color);
		border-radius: 2px;
		animation: wavePulse 1s ease-in-out infinite;
	}

	.wave:nth-child(2) {
		animation-delay: 0.2s;
	}

	.wave:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes wavePulse {
		0%, 100% {
			height: 6px;
		}
		50% {
			height: 18px;
		}
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}
</style>
