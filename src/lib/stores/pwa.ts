import { writable } from 'svelte/store';

export const deferredInstallPrompt = writable<any>(null);
export const isAppInstalled = writable<boolean>(false);

if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredInstallPrompt.set(e);
	});

	window.addEventListener('appinstalled', () => {
		deferredInstallPrompt.set(null);
		isAppInstalled.set(true);
	});

	// Check if already in standalone mode
	if (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as any).standalone === true
	) {
		isAppInstalled.set(true);
	}
}

export async function promptInstallApp(): Promise<boolean> {
	let promptEvent: any = null;
	deferredInstallPrompt.subscribe((e) => (promptEvent = e))();

	if (!promptEvent) return false;

	promptEvent.prompt();
	const choiceResult = await promptEvent.userChoice;
	deferredInstallPrompt.set(null);
	return choiceResult.outcome === 'accepted';
}
