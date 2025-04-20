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

	// Aseguramos que las notificaciones estén habilitadas
	$effect(() => {
		Notification.requestPermission();
	});
</script>

<main>
	<header>
		<h1>{$isWorking ? "Trabajando" : "Descansando"}</h1>
		<img
			src={$isWorking ? "/imgs/focus.jpg" : "/imgs/rest.jpg"}
			alt="Tomatito"
		/>
	</header>

	<h1>{$timerDisplay}</h1>

	<footer>
		<div class="actions">
			{#if !$isRunning}
				<Button onclick={() => startTimer()} icon={playIcon}>Iniciar</Button>
			{:else}
				<Button onclick={() => stopTimer()} icon={stopIcon}>Detener</Button>
				<Button onclick={() => nextTimer()} icon={nextIcon}>Siguiente</Button>
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

	h1 {
		font-size: 3rem;
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
