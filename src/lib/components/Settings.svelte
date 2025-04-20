<script lang="ts">
	import { alarmVolume } from "../stores/timer";
	import { onMount } from "svelte";

	let showSettings = false;
	let volume = $alarmVolume;
	let testAudio: HTMLAudioElement;

	function toggleSettings() {
		showSettings = !showSettings;
	}

	function updateVolume() {
		alarmVolume.set(volume);
		localStorage.setItem("alarmVolume", volume.toString());
	}

	function playTestSound() {
		if (testAudio) {
			testAudio.pause();
			testAudio.currentTime = 0;
		}
		testAudio = new Audio("/sounds/alarm.wav");
		testAudio.volume = volume;
		testAudio.play();
	}

	onMount(() => {
		// Cargar configuración de volumen almacenada
		const savedVolume = localStorage.getItem("alarmVolume");
		if (savedVolume !== null) {
			volume = parseFloat(savedVolume);
			alarmVolume.set(volume);
		}
	});
</script>

<button
	class="settings-toggle"
	on:click={toggleSettings}
	aria-label="Configuración"
	aria-expanded={showSettings}
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
		<circle cx="12" cy="12" r="3"></circle>
		<path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
		></path>
	</svg>
	<span>Configuración</span>
</button>

{#if showSettings}
	<div
		class="settings-overlay"
		on:click={toggleSettings}
		role="dialog"
		aria-modal="true"
		aria-labelledby="settings-title"
	>
		<div class="settings-modal" on:click|stopPropagation tabindex="-1">
			<header>
				<h2 id="settings-title">Configuración</h2>
				<button class="close-button" on:click={toggleSettings}>×</button>
			</header>

			<div class="settings-content">
				<div class="setting-group">
					<label for="volume-control"
						>Volumen de alarma ({Math.round(volume * 100)}%)</label
					>
					<div class="volume-controls">
						<input
							id="volume-control"
							type="range"
							min="0"
							max="1"
							step="0.01"
							bind:value={volume}
							on:change={updateVolume}
						/>
						<button
							class="test-sound"
							on:click={playTestSound}
							aria-label="Probar sonido"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
								<path
									d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
								></path>
							</svg>
							Probar
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-toggle {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background-color: var(--button-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
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

	.settings-toggle:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--shadow-color);
		border-color: var(--accent-color);
	}

	.settings-overlay {
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

	.settings-modal {
		background-color: var(--bg-primary);
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
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

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: var(--text-primary);
		padding: 0.2rem 0.5rem;
		line-height: 1;
	}

	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.setting-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.volume-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	input[type="range"] {
		flex-grow: 1;
		height: 8px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--bg-tertiary);
		border-radius: 4px;
		outline: none;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: var(--accent-color);
		border-radius: 50%;
		cursor: pointer;
	}

	input[type="range"]::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: var(--accent-color);
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	.test-sound {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--button-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.test-sound:hover {
		background-color: var(--button-hover);
		border-color: var(--accent-color);
	}

	@media (max-width: 600px) {
		.settings-modal {
			width: 95%;
			padding: 1rem;
		}

		.settings-toggle span {
			display: none;
		}
	}
</style>
