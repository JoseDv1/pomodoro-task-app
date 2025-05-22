import { writable, derived, get } from 'svelte/store';

// Constantes
export const times = [
	{ name: "1 minuto", value: 60 },
	{ name: "5 minutos", value: 300 },
	{ name: "10 minutos", value: 600 },
	{ name: "15 minutos", value: 900 },
	{ name: "30 minutos", value: 1800 },
	{ name: "45 minutos", value: 2700 },
	{ name: "1 hora", value: 3600 },
	{ name: "2 horas", value: 7200 },
];

// Estados
export const interval = writable<number | undefined>(undefined);
export const timer = writable<number>(1800);
export const isWorking = writable<boolean>(true);
export const isRunning = writable<boolean>(false);
export const workingTime = writable<number>(
	parseInt(window.localStorage.getItem("workingTime") ?? "1800", 10)
);
workingTime.subscribe((value) => {
	window.localStorage.setItem("workingTime", value.toString());
});
export const breakTime = writable<number>(
	parseInt(window.localStorage.getItem("breakTime") ?? "300", 10)
);
breakTime.subscribe((value) => {
	window.localStorage.setItem("breakTime", value.toString());
});
export const pomodoroCount = writable<number>(
	parseInt(window.localStorage.getItem("pomodoroCount") ?? "0", 10)
);
pomodoroCount.subscribe((count) => {
	window.localStorage.setItem("pomodoroCount", count.toString());
});
export const alarmVolume = writable<number>(0.5);

// Long Break related stores
export const longBreakTime = writable<number>(
	parseInt(window.localStorage.getItem("longBreakTime") ?? "900", 10)
);
longBreakTime.subscribe((value) => {
	window.localStorage.setItem("longBreakTime", value.toString());
});

export const pomodorosPerLongBreak = writable<number>(
	parseInt(window.localStorage.getItem("pomodorosPerLongBreak") ?? "4", 10)
);
pomodorosPerLongBreak.subscribe((value) => {
	window.localStorage.setItem("pomodorosPerLongBreak", value.toString());
});

export const currentPomodoroCycle = writable<number>(
	parseInt(window.localStorage.getItem("currentPomodoroCycle") ?? "0", 10)
);
currentPomodoroCycle.subscribe((value) => {
	window.localStorage.setItem("currentPomodoroCycle", value.toString());
});

export const isLongBreak = writable<boolean>(false); // Not persisted

export const timerDisplay = derived(timer, $timer => {
	const hours = Math.floor($timer / 3600);
	const minutes = Math.floor(($timer % 3600) / 60);
	const seconds = $timer % 60;

	if (hours > 0) {
		// Formato con horas (HH:MM:SS)
		return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	} else {
		// Formato sin horas (MM:SS)
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}
});

// Funciones
export function setTimer(time: number) {
	timer.set(time);
}

export function updateTime() {
	let currentTimer = get(timer);
	currentTimer -= 1;
	timer.set(currentTimer);

	if (currentTimer === 0) {
		nextTimer();
	}
}

export function startTimer() {
	const currentInterval = get(interval);
	if (currentInterval) clearInterval(currentInterval);

	const newInterval = setInterval(updateTime, 1000) as unknown as number;
	interval.set(newInterval);
	isRunning.set(true);

	// Comunicar con el Service Worker
	if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			action: 'START_TIMER',
			duration: get(timer),
			type: get(isWorking) ? 'work' : 'break'
		});
	}
}

export function stopTimer() {
	const currentInterval = get(interval);
	if (currentInterval) clearInterval(currentInterval);
	interval.set(undefined);
	isRunning.set(false);

	// Comunicar con el Service Worker
	if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			action: 'STOP_TIMER'
		});
	}
}

export function resetTimer(initialTime: number) {
	stopTimer();
	setTimer(initialTime);
}

export function nextTimer() {
	// Reproducir sonido
	const audio = new Audio("/sounds/alarm.wav");
	audio.volume = get(alarmVolume); // Usar el volumen configurado por el usuario
	audio.play();

	const currentlyWorking = get(isWorking);
	let notificationTitle = "";
	let notificationBody = "";
	let notificationIcon = "";

	if (currentlyWorking) {
		// Work session ended
		pomodoroCount.update((count) => count + 1);
		currentPomodoroCycle.update((cycle) => cycle + 1);
		isWorking.set(false);

		if (get(pomodorosPerLongBreak) > 0 && get(currentPomodoroCycle) >= get(pomodorosPerLongBreak)) {
			// Time for a long break
			setTimer(get(longBreakTime));
			currentPomodoroCycle.set(0);
			isLongBreak.set(true);
			notificationTitle = "¡Hora de un descanso largo!";
			notificationBody = "¡Buen trabajo! Tómate un respiro más largo.";
			notificationIcon = "/imgs/rest.jpg"; // Or a specific long break image
		} else {
			// Time for a short break
			setTimer(get(breakTime));
			isLongBreak.set(false);
			notificationTitle = "¡Hora de descansar!";
			notificationBody = "¡Es hora de descansar! Cuida tu enfoque y tu salud.";
			notificationIcon = "/imgs/rest.jpg";
		}
	} else {
		// Break session ended
		setTimer(get(workingTime));
		isWorking.set(true);
		isLongBreak.set(false); // Reset long break status
		notificationTitle = "¡Hora de trabajar!";
		notificationBody = "¡Es hora de trabajar! A mover las manitas.";
		notificationIcon = "/imgs/focus.jpg";
	}

	try {
		if ("Notification" in window && Notification.permission === "granted") {
			new Notification(notificationTitle, {
				body: notificationBody,
				icon: notificationIcon,
			});
		}
	} catch (error) {
		console.error(error);
	}

	// Si el temporizador estaba en marcha, comenzamos el nuevo temporizador
	// también en el Service Worker
	if (get(isRunning)) {
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				action: 'START_TIMER',
				duration: get(timer),
				type: get(isWorking) ? 'work' : 'break'
			});
		}
	}
}

// Función para actualizar el timer desde el Service Worker
export function syncTimerWithServiceWorker(timeLeft: number, isActive: boolean, isWork: boolean) {
	// Actualizar el tiempo restante
	timer.set(timeLeft);

	// Actualizar el estado de trabajo/descanso
	isWorking.set(isWork);

	// Actualizar el estado de ejecución
	isRunning.set(isActive);

	// Si está activo, asegurarse de que el temporizador local esté en marcha
	if (isActive) {
		const currentInterval = get(interval);
		if (currentInterval) clearInterval(currentInterval);

		const newInterval = setInterval(updateTime, 1000) as unknown as number;
		interval.set(newInterval);
	}
}


