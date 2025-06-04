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
export const endTime = writable<number | null>(null);
export const workingTime = writable<number>(1800);
export const breakTime = writable<number>(300);
export const pomodoroCount = writable<number>(
	parseInt(window.localStorage.getItem("pomodoroCount") ?? "0", 10)
);
pomodoroCount.subscribe((count) => {
	window.localStorage.setItem("pomodoroCount", count.toString());
});
export const alarmVolume = writable<number>(0.5);

// Cargar estado persistente del temporizador
if (typeof window !== 'undefined') {
    const savedEnd = window.localStorage.getItem('timerEnd');
    const savedType = window.localStorage.getItem('timerType');

    if (savedEnd && savedType) {
        const end = parseInt(savedEnd, 10);
        if (end > Date.now()) {
            endTime.set(end);
            isWorking.set(savedType === 'work');
            const remaining = Math.ceil((end - Date.now()) / 1000);
            timer.set(remaining);
            isRunning.set(true);
            const newInterval = setInterval(updateTime, 1000) as unknown as number;
            interval.set(newInterval);
        } else {
            window.localStorage.removeItem('timerEnd');
            window.localStorage.removeItem('timerType');
        }
    }
}

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
        const target = get(endTime);
        if (target === null) return;

        const remaining = Math.ceil((target - Date.now()) / 1000);
        timer.set(remaining);

        if (remaining <= 0) {
                nextTimer();
        }
}

export function startTimer() {
        const currentInterval = get(interval);
        if (currentInterval) clearInterval(currentInterval);

        const end = Date.now() + get(timer) * 1000;
        endTime.set(end);
        if (typeof window !== 'undefined') {
                window.localStorage.setItem('timerEnd', end.toString());
                window.localStorage.setItem('timerType', get(isWorking) ? 'work' : 'break');
        }

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
        endTime.set(null);
        if (typeof window !== 'undefined') {
                window.localStorage.removeItem('timerEnd');
                window.localStorage.removeItem('timerType');
        }

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

	try {
		if ("Notification" in window && Notification.permission === "granted") {
			new Notification(
				get(isWorking) ? "¡Hora de descansar!" : "¡Hora de trabajar!",
				{
					body: get(isWorking)
						? `¡Es hora de descansar! Cuida tu enfoque y tu salud.`
						: `¡Es hora de trabajar! A mover las manitas.`,
					icon: get(isWorking) ? "/imgs/rest.jpg" : "/imgs/focus.jpg",
				}
			);
		}
	} catch (error) {
		console.error(error);
	}

        if (get(isWorking)) {
                // Incrementamos el contador de pomodoros completados
                pomodoroCount.update((count) => count + 1)
                // Guardamos el contador en localStorage
                window.localStorage.setItem("pomodoroCount", get(pomodoroCount).toString());
                setTimer(get(breakTime));
                isWorking.set(false);
        } else {
                setTimer(get(workingTime));
                isWorking.set(true);
        }

        // Si el temporizador estaba en marcha, comenzamos el nuevo temporizador
        // también en el Service Worker
        if (get(isRunning)) {
                const newEnd = Date.now() + get(timer) * 1000;
                endTime.set(newEnd);
                if (typeof window !== 'undefined') {
                        window.localStorage.setItem('timerEnd', newEnd.toString());
                        window.localStorage.setItem('timerType', get(isWorking) ? 'work' : 'break');
                }
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
        endTime.set(Date.now() + timeLeft * 1000);
        if (typeof window !== 'undefined') {
                window.localStorage.setItem('timerEnd', (Date.now() + timeLeft * 1000).toString());
                window.localStorage.setItem('timerType', isWork ? 'work' : 'break');
        }

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


