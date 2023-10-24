<script lang="ts">
	import type { Pomodoro } from "../../types/main";
	import play from "../../assets/play.svg?raw";
	import pause from "../../assets/pause.svg?raw";
	import reset from "../../assets/reset.svg?raw";
	import next from "../../assets/next.svg?raw";

	// Binding
	let tiempo: string = "15";
	let restTime: string = "5";
	let running: boolean = false;
	let resting: boolean = false;

	// Estados del timer
	$: counterTime = Number(tiempo) * 60; // <-- Derived state from tiempo

	// Create a timer with the counterTime <-- Derived state from counterTime and tiempo
	$: timer = `${Math.floor(counterTime / 60)}:${
		counterTime % 60 < 10 ? "0" + (counterTime % 60) : counterTime % 60
	}`;

	// Functions
	let pomodoro: Pomodoro = createPomodoro();
	function createPomodoro(): Pomodoro {
		// Pomodoro Interval
		let interval: number | null = null;
		function endTimer() {
			if (!resting) {
				//Si Se acaba el Pomodoro
				// Reproducir sonido
				const audio = new Audio("sounds/alarm.wav");
				audio.play();

				// Mostrar notificacion
				new Notification("Pomodoro App", {
					body: "Time is up!",
					icon: "imgs/tomato.png",
				});

				// Mostrar descanso

				resting = true;
				counterTime = Number(restTime) * 60;
			}
			// Si estaba descansando termino, iniciar un nuevo pomodoro
			else {
				//Si Se acaba el descanso
				resting = false;
				counterTime = Number(tiempo) * 60;
			}
		}

		const updateCounter = () => {
			counterTime--;

			// Verificar si el contador llego a 0 y empezar el descanso
			if (counterTime <= 0) {
				endTimer();
			}
		};

		function startCounter() {
			if (!tiempo) {
				alert("Please select a focus time");
				return;
			}

			running = true;
			clearInterval(interval as number);
			interval = setInterval(updateCounter, 1000);
		}

		function stopCounter() {
			clearInterval(interval as number);
			interval = null;
			running = false;
		}

		function toggleCounter() {
			if (interval) {
				stopCounter();
			} else {
				startCounter();
			}
		}

		function reset() {
			stopCounter();
			if (resting) {
				counterTime = Number(restTime) * 60;
			} else {
				counterTime = Number(tiempo) * 60;
			}
		}

		function nextTimer() {
			counterTime = 0;
		}

		return {
			toggleCounter,
			reset,
			nextTimer,
		};
	}
</script>

<section>
	<div class="timer">
		<img src={resting ? "/imgs/rest.jpg" : "/imgs/focus.jpg"} alt="Tomatito" />
		<h2>{resting ? "Rest" : "Focus!"}</h2>
		<span>{timer}</span>
	</div>

	<div class="btns">
		{#if !running}
			<label for="">
				Focus Time
				<select bind:value={tiempo} on:change={pomodoro.reset}>
					<option value="0.05">3 Segundos</option>
					<option value="0.25">15 Segundos</option>
					<option value="0.5"> 30 Segundos</option>
					<option value="5">5 Minutes</option>
					<option value="10">10 Minutes</option>
					<option value="15">15 Minutes</option>
					<option value="25">25 Minutes</option>
					<option value="30">30 Minutes</option>
					<option value="35">35 Minutes</option>
					<option value="40">40 Minutes</option>
					<option value="45">45 Minutes</option>
					<option value="50">50 Minutes</option>
					<option value="55">55 Minutes</option>
					<option value="60">60 Minutes</option>
				</select>
			</label>

			<label for="">
				Rest Time

				<select bind:value={restTime} on:change={pomodoro.reset}>
					<option value="" selected disabled> Set Rest Time</option>
					<option value="1">1 Minute</option>
					<option value="2">2 Minutes</option>
					<option value="3">3 Minutes</option>
					<option value="5">5 Minutes</option>
					<option value="10">10 Minutes</option>
					<option value="15">15 Minutes</option>
					<option value="30">30 Minutes</option>
					<option value="45">45 Minutes</option>
					<option value="60">60 Minutes</option>
				</select>
			</label>
		{/if}
		<button on:click={pomodoro.toggleCounter}>
			{#if running}
				{@html pause}
				Pause
			{:else}
				{@html play}
				Play
			{/if}
		</button>
		{#if !running && !(counterTime === Number(tiempo) * 60) && !(counterTime === Number(restTime) * 60)}
			<button on:click={pomodoro.reset}>
				{@html reset}
				Reset</button
			>
		{/if}
		{#if running}
			<button on:click={pomodoro.nextTimer}>
				{@html next}
				Next</button
			>
		{/if}
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		grid-column: 1 / 2;
		grid-row: 1 / 3;
		max-height: calc(100vh - 5rem);
	}

	.timer {
		font-size: 4rem;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}

	.timer img {
		width: 10rem;
		height: 10rem;
		object-fit: cover;
		object-position: center;
	}

	img {
		width: 10rem;
		height: 10rem;
	}

	.btns {
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		flex-wrap: wrap-reverse;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	span {
		font-size: 5rem;
	}

	select {
		padding: 0.5rem;
		border: none;
		border-radius: 5px;
		background-color: #ccc;
		cursor: pointer;
		font-size: 1rem;
	}

	button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 5px;
		background-color: #ccc;
		cursor: pointer;
		font-size: 1rem;
		margin-top: 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;

		&:hover {
			background-color: #aaa;
		}

		&:active {
			background-color: #888;
		}
	}
</style>
