import { notifyGoWakeLock } from './goBridge';

let wakeLockSentinel: any = null;

export async function requestWakeLock(): Promise<boolean> {
	notifyGoWakeLock(true);
	if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
		return false;
	}

	try {
		wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
		wakeLockSentinel.addEventListener('release', () => {
			wakeLockSentinel = null;
		});
		return true;
	} catch (err) {
		console.warn('Screen WakeLock request failed:', err);
		wakeLockSentinel = null;
		return false;
	}
}

export async function releaseWakeLock(): Promise<void> {
	notifyGoWakeLock(false);
	if (wakeLockSentinel) {
		try {
			await wakeLockSentinel.release();
		} catch (e) {
			// ignore
		}
		wakeLockSentinel = null;
	}
}
