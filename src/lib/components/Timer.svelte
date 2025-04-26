<script lang="ts">
	import Button from "./Button.svelte";
	import playIcon from "../../assets/play.svg?raw";
	import resetIcon from "../../assets/reset.svg?raw";
	import nextIcon from "../../assets/next.svg?raw";
	import stopIcon from "../../assets/pause.svg?raw";

	// Importamos todo desde el store
	import {
		breakTime,
		stopTimer,
		resetTimer,
		setTimer,
		startTimer,
		isRunning,
		timerDisplay,
		isWorking,
		timer,
		nextTimer,
		times,
		workingTime,
	} from "../stores/timer";

	// Función para solicitar permisos de notificación (se llamará con clic de usuario)
	function requestNotificationPermission() {
		if ("Notification" in window) {
			Notification.requestPermission().then((permission) => {
				console.log("Permiso de notificación:", permission);
			});
		}
	}

	// Función para iniciar el temporizador también en el Service Worker
	function startTimerWithServiceWorker() {
		// Solicitar permisos de notificación al iniciar el temporizador (acción de usuario)
		requestNotificationPermission();

		startTimer(); // Inicia el temporizador localmente

		// Enviar mensaje al Service Worker para que también ejecute el temporizador
		if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				action: "START_TIMER",
				duration: $timer,
				type: $isWorking ? "work" : "break",
			});
		}
	}

	// Función para detener el temporizador también en el Service Worker
	function stopTimerWithServiceWorker() {
		stopTimer(); // Detiene el temporizador localmente

		// Enviar mensaje al Service Worker para que detenga el temporizador
		if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				action: "STOP_TIMER",
			});
		}
	}

	// Función para cambiar al siguiente temporizador con Service Worker
	function nextTimerWithServiceWorker() {
		nextTimer(); // Cambia el temporizador localmente

		// Si estamos iniciando el temporizador, enviamos mensaje al Service Worker
		if ($isRunning) {
			if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
				navigator.serviceWorker.controller.postMessage({
					action: "START_TIMER",
					duration: $timer,
					type: $isWorking ? "work" : "break",
				});
			}
		}
	}
</script>

<main>
	<header>
		<h2>{$isWorking ? "Trabajando" : "Descansando"}</h2>
		<img
			src={$isWorking ? "/imgs/focus.jpg" : "/imgs/rest.jpg"}
			alt="Tomatito"
		/>
	</header>

	<h1>{$timerDisplay}</h1>

	<footer>
		<div class="actions">
			{#if !$isRunning}
				<Button onclick={() => startTimerWithServiceWorker()} icon={playIcon}
					>Iniciar</Button
				>
			{:else}
				<Button onclick={() => stopTimerWithServiceWorker()} icon={stopIcon}
					>Detener</Button
				>
			{/if}

			{#if !$isRunning && !($timer === $workingTime) && !($timer === $breakTime)}
				<Button
					onclick={() => resetTimer($isWorking ? $workingTime : $breakTime)}
					icon={resetIcon}
					>Reiniciar
				</Button>
			{/if}
		</div>

		<div class="selects">
			<label>
				Tiempo de trabajo
				<select
					bind:value={$workingTime}
					onchange={() => {
						if (isWorking) {
							setTimer($workingTime);
						}
					}}
				>
					{@render timerOptions()}
				</select>
			</label>

			<label>
				Tiempo de descanso
				<select
					bind:value={$breakTime}
					onchange={() => {
						if (!$isWorking) {
							setTimer($breakTime);
						}
					}}
				>
					{@render timerOptions()}
				</select>
			</label>
		</div>
	</footer>
</main>

{#snippet timerOptions()}
	{#each times as time}
		<option value={time.value}>{time.name}</option>
	{/each}
{/snippet}

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	h2 {
		font-size: 2.5rem;
		color: var(--text-primary);
	}

	footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.selects {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;

		label {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}
	}

	select {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 5px;
		background-color: var(--bg-secondary);
		cursor: pointer;
		font-size: 1rem;
		color: var(--text-primary);
		transition: all 0.3s ease;
	}

	select:hover {
		border-color: var(--accent-color);
	}

	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	img {
		border-radius: 50%;
		width: 50%;
		aspect-ratio: 1/1;
	}
</style>
