import './app.css'
import App from './App.svelte'

let app: App | null = null;
const targetElement = document.getElementById('app');

if (targetElement) {
  app = new App({
    target: targetElement,
  });
} else {
  console.error('Target element not found');
}

export default app;