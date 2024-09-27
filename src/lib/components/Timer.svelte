<script lang="ts">
	// States
	let interval = $state<number | undefined>();
	let timer = $state(0);
	let timerDisplay = $derived(
		`${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`,
	);
	let isWorking = $state(true);
	let isRunning = $state(false);

	let workingTime = $state("60");
	let computedWTime = $derived(Number(workingTime));

	let breakTime = $state("60");
	let computedBTime = $derived(Number(breakTime));

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
		if (!interval) clearInterval(interval);

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

	function resumeTimer() {
		interval = setInterval(updateTime, 1000);
		isRunning = true;
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
				<button
					onclick={() => startTimer(computedWTime)}
					aria-label="Start timer for 4 seconds"
				>
					Iniciar
				</button>
				<button onclick={resumeTimer} aria-label="Resume timer">
					Reanudar
				</button>
			{:else}
				<button onclick={stopTimer} aria-label="Stop timer"> Detener </button>
				<button onclick={nextTimer} aria-label="Stop timer"> Siguiente </button>
			{/if}

			<button
				onclick={() => resetTimer(computedWTime)}
				aria-label="Reset timer"
			>
				Reiniciar
			</button>
		</div>

		<div class="selects">
			<label>
				Tiempo de trabajo
				<select bind:value={workingTime}>
					<option value="5">5 segundos</option>
					<option value="60">1 minuto</option>
					<option value="300">5 minutos</option>
					<option value="600">10 minutos</option>
				</select>
			</label>

			<label>
				Tiempo de descanso
				<select>
					<option value="60">1 minuto</option>
					<option value="300">5 minutos</option>
					<option value="600">10 minutos</option>
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
	}

	button {
		padding: 0.5rem 1rem;
		margin: 0.5rem;
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
