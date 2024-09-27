<script lang="ts">
	import Button from "./Button.svelte";
	import playIcon from "../../assets/play.svg?raw";
	import resetIcon from "../../assets/reset.svg?raw";
	import nextIcon from "../../assets/next.svg?raw";
	import stopIcon from "../../assets/pause.svg?raw";
	import { onMount } from "svelte";

	let times = [
		{ name: "1 minuto", value: 60 },
		{ name: "5 minutos", value: 300 },
		{ name: "10 minutos", value: 600 },
		{ name: "15 minutos", value: 900 },
		{ name: "30 minutos", value: 1800 },
		{ name: "45 minutos", value: 2700 },
		{ name: "1 hora", value: 3600 },
		{ name: "2 horas", value: 7200 },
		{ name: "3 horas", value: 10800 },
		{ name: "4 horas", value: 14400 },
	];

	// States
	let interval = $state<number | undefined>();
	let timer = $state(1800);

	let isWorking = $state(true);
	let isRunning = $state(false);

	let workingTime = $state(1800);
	let breakTime = $state(300);

	// Derived
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

	function startTimer() {
		// Limpiar el intervalo si ya existe
		if (interval) clearInterval(interval);

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
		// Reproducir sonido
		const audio = new Audio("/sounds/alarm.wav");
		audio.play();

		try {
			if ("Notification" in window && Notification.permission === "granted") {
				new Notification(
					isWorking ? "¡Hora de descansar!" : "¡Hora de trabajar!",
					{
						body: isWorking
							? `¡Es hora de descansar! Cuida tu enfoque y tu salud.`
							: `¡Es hora de trabajar! A mover las manitas.`,
						icon: isWorking ? "/imgs/rest.jpg" : "/imgs/focus.jpg",
					},
				);
			}
		} catch (error) {
			console.error(error);
		}

		if (isWorking) {
			setTimer(breakTime);
			isWorking = false;
		} else {
			setTimer(workingTime);
			isWorking = true;
		}
	}

	$effect(() => {
		Notification.requestPermission();
	});
</script>

<main>
	<header>
		<h1>{isWorking ? "Trabajando" : "Descansando"}</h1>
		<img
			src={isWorking ? "/imgs/focus.jpg" : "/imgs/rest.jpg"}
			alt="Tomatito"
		/>
	</header>

	<h1>{timerDisplay}</h1>

	<footer>
		<div class="actions">
			{#if !isRunning}
				<Button onclick={() => startTimer()} icon={playIcon}>Iniciar</Button>
			{:else}
				<Button onclick={() => stopTimer()} icon={stopIcon}>Detener</Button>
				<Button onclick={() => nextTimer()} icon={nextIcon}>Siguiente</Button>
			{/if}

			{#if !isRunning && !(timer === Number(workingTime)) && !(timer === Number(breakTime) * 60)}
				<Button
					onclick={() => resetTimer(isWorking ? workingTime : breakTime)}
					icon={resetIcon}>Reiniciar</Button
				>
			{/if}
		</div>

		<div class="selects">
			<label>
				Tiempo de trabajo
				<select
					bind:value={workingTime}
					onchange={() => {
						if (isWorking) {
							setTimer(workingTime);
						}
					}}
				>
					{#each times as time}
						<option value={time.value}>{time.name}</option>
					{/each}
				</select>
			</label>

			<label>
				Tiempo de descanso
				<select
					bind:value={breakTime}
					onchange={() => {
						if (!isWorking) {
							setTimer(breakTime);
						}
					}}
				>
					{#each times as time}
						<option value={time.value}>{time.name}</option>
					{/each}
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
	}

	h1 {
		font-size: 3rem;
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
		border: none;
		border-radius: 5px;
		background-color: #ccc;
		cursor: pointer;
		font-size: 1rem;
		color: black;
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
