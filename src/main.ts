// filepath: d:\Dev\github\pomodoro-task-app\src\main.ts
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { get } from 'svelte/store'


const root = document.getElementById("app") as HTMLElement
const app = mount(App, { target: root })

// Registrar el Service Worker para PWA
if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			const registration = await navigator.serviceWorker.register('/service-worker.js');
			console.log('Service Worker registrado correctamente:', registration);
			// Establecer comunicación con el Service Worker
			setupServiceWorkerCommunication();
		} catch (error) {
			console.error('Error al registrar el Service Worker:', error);
		}
	});
}

// Función para establecer la comunicación con el Service Worker
function setupServiceWorkerCommunication() {
	// Escuchar mensajes del Service Worker
	navigator.serviceWorker.addEventListener('message', (event) => {
		const data = event.data;

		// Gestionar eventos del Service Worker
		if (data.action === 'TIMER_ENDED') {
			// Se puede importar y llamar aquí a las funciones de la tienda de temporizador
			console.log('Temporizador finalizado en segundo plano:', data.type);

			// Aquí podríamos importar dinámicamente los módulos necesarios
			import('./lib/stores/timer').then(timerModule => {
				if (data.type === 'work') {
					// Incrementar contador de pomodoros y cambiar a descanso
					timerModule.pomodoroCount.update((count: number) => count + 1);
					timerModule.isWorking.set(false);
					timerModule.timer.set(get(timerModule.breakTime));
				} else {
					// Cambiar a pomodoro
					timerModule.isWorking.set(true);
					timerModule.timer.set(get(timerModule.workingTime));
				}

				// Reproducir sonido de alarma
				const audio = new Audio('/sounds/alarm.wav');
				audio.play().catch(error => console.log('Error al reproducir sonido:', error));
			});
		}

		if (data.action === 'TIMER_STATE') {
			// Actualizar la interfaz con el estado actual del temporizador
			console.log('Estado del temporizador recibido:', data);

			// Actualizar la tienda de temporizador
			import('./lib/stores/timer').then(timerModule => {
				if (data.isRunning) {
					timerModule.timer.set(data.timeLeft);
					timerModule.isWorking.set(data.type === 'work');
					timerModule.isRunning.set(true);

					// Reiniciar el temporizador localmente para sincronizarlo
					const currentInterval = get(timerModule.interval);
					if (currentInterval) {
						clearInterval(currentInterval);
					}

					const newInterval = setInterval(timerModule.updateTime, 1000) as unknown as number;
					timerModule.interval.set(newInterval);
				}
			});
		}
	});

	// Sincronizar con el service worker cuando la ventana obtiene el foco
	window.addEventListener('focus', () => {
		getTimerStateFromServiceWorker();
	});

	// También sincronizar al inicio
	getTimerStateFromServiceWorker();
}

// Función para obtener el estado actual del temporizador del Service Worker
function getTimerStateFromServiceWorker() {
	if (navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			action: 'GET_TIMER_STATE'
		});
	}
}

export default app
