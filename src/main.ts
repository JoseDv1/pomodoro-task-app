import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

const app = mount(App, { target: document.getElementById("app") as HTMLElement })

// Registrar el Service Worker para PWA
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js')
			.then(registration => {
				console.log('Service Worker registrado correctamente:', registration);
			})
			.catch(error => {
				console.error('Error al registrar el Service Worker:', error);
			});
	});
}

export default app
