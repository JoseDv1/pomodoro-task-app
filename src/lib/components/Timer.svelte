<script lang="ts">
	import Button from "./Button.svelte";

	import playIcon from "../../assets/play.svg?raw";
	import resetIcon from "../../assets/reset.svg?raw";
	import nextIcon from "../../assets/next.svg?raw";

	// States
	let interval = $state<number | undefined>();
	let timer = $state(60 * 25);

	let isWorking = $state(true);
	let isRunning = $state(false);

	let workingTime = $state(25 * 60);
	let computedWTime = $derived(Number(workingTime));

	let breakTime = $state("60");
	let computedBTime = $derived(Number(breakTime));

	let timerDisplay = $derived(
		`${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`,
	);

	// Functions
	function setTimer(time: number) {
		timer = time;
	}

	function updateTime() {
		timer -= 1;

		// Siguiente estado de isWorking
		if (timer === 0) {
			nextTimer();
		}
	}

	function startTimer(time: number) {
		// Limpiar el intervalo si ya existe
		if (interval) clearInterval(interval);

		// Iniciar el timer
		setTimer(time);

		// Iniciar el intervalo
		interval = setInterval(updateTime, 1000);

		// Actualizar el estado de isRunning
		isRunning = true;
	}

	function stopTimer() {
		clearInterval(interval);
		interval = undefined;
		isRunning = false;
	}

	function resetTimer(intialTime: number) {
		stopTimer();
		setTimer(intialTime);
	}

	function nextTimer() {
		if (isWorking) {
			setTimer(computedBTime);
			isWorking = false;
		} else {
			setTimer(computedWTime);
			isWorking = true;
		}
	}
</script>

<main>
	<header>
		{#if isWorking}
			<h2>Trabajando</h2>
		{:else}
			<h2>Descansando</h2>
		{/if}
	</header>

	<h1>{timerDisplay}</h1>

	<footer>
		<div class="actions">
			{#if !isRunning}
				<Button onclick={() => startTimer(computedWTime)} icon={playIcon}
					>Iniciar</Button
				>

				<Button onclick={() => resetTimer(computedWTime)} icon={playIcon}
					>Reiniciar</Button
				>
			{:else}
				<Button onclick={() => stopTimer()} icon={playIcon}>Detener</Button>
				<Button onclick={() => nextTimer()} icon={playIcon}>Siguiente</Button>
			{/if}
		</div>

		<div class="selects">
			<label>
				Tiempo de trabajo
				<select bind:value={workingTime}>
					<option value="5">5 segundos</option>
					<option value="60">1 minuto</option>
					<option value="300">5 minutos</option>
					<option value="600">10 minutos</option>
					<option value="1500">25 minutos</option>
					<option value="1800">30 minutos</option>
				</select>
			</label>

			<label>
				Tiempo de descanso
				<select>
					<option value="60">1 minuto</option>
					<option value="300">5 minutos</option>
					<option value="600">10 minutos</option>
					<option value="900">15 minutos</option>
					<option value="1200">20 minutos</option>
				</select>
			</label>
		</div>
	</footer>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
	}

	h1 {
		font-size: 3rem;
	}

	footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
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
		gap: 1rem;

		label {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}
	}

	select {
		padding: 0.5rem 1rem;
	}
</style>
