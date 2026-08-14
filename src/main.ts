import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';
import {
	syncFromServiceWorker,
	handleSessionComplete,
	startTimer,
	stopTimer,
	skipTimer,
} from './lib/stores/timer';

const root = document.getElementById('app') as HTMLElement;
const app = mount(App, { target: root });

if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			const registration = await navigator.serviceWorker.register('/service-worker.js');
			console.log('Service Worker registrado correctamente:', registration);

			navigator.serviceWorker.addEventListener('message', (event) => {
				const data = event.data;
				if (!data) return;

				if (data.action === 'TIMER_ENDED') {
					console.log('Evento TIMER_ENDED recibido del Service Worker:', data.type);
					handleSessionComplete();
				} else if (data.action === 'TIMER_STATE') {
					if (data.isRunning && typeof data.timeLeft === 'number') {
						syncFromServiceWorker(data.timeLeft, data.type === 'work', data.isRunning);
					}
				} else if (data.action === 'ACTION_PAUSE') {
					stopTimer(false);
				} else if (data.action === 'ACTION_START') {
					startTimer();
				} else if (data.action === 'ACTION_SKIP') {
					skipTimer();
				}
			});

			// Request initial timer state from Service Worker when window gains focus
			window.addEventListener('focus', () => {
				if (navigator.serviceWorker.controller) {
					navigator.serviceWorker.controller.postMessage({
						action: 'GET_TIMER_STATE',
					});
				}
			});

			if (navigator.serviceWorker.controller) {
				navigator.serviceWorker.controller.postMessage({
					action: 'GET_TIMER_STATE',
				});
			}
		} catch (error) {
			console.warn('Error al registrar el Service Worker:', error);
		}
	});
}

export default app;
