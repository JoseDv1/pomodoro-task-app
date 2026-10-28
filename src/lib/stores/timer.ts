import { writable, derived, get } from 'svelte/store';
import type { TimerMode } from '../types';
import { settings } from './settings';
import { recordCompletedPomodoro } from './stats';
import { incrementActiveTaskPomodoro, activeTask } from './task';
import { playAlarmSound, playTickSound } from '../utils/audioSynth';
import { updateMediaSession, clearMediaSession } from '../utils/mediaSession';
import { requestWakeLock, releaseWakeLock } from '../utils/wakeLock';
import { notifyGoDesktopNotification } from '../utils/goBridge';

const POMODORO_COUNT_KEY = 'pomodoroCount';
const TIMER_STATE_KEY = 'pomodoro_timer_state';

// Load stored tomato balance
function loadPomodoroCount(): number {
	if (typeof window === 'undefined') return 0;
	try {
		return parseInt(localStorage.getItem(POMODORO_COUNT_KEY) || '0', 10) || 0;
	} catch {
		return 0;
	}
}

// Stores
export const mode = writable<TimerMode>('work');
export const duration = writable<number>(25 * 60);
export const timeLeft = writable<number>(25 * 60);
export const isRunning = writable<boolean>(false);
export const endTime = writable<number | null>(null);
export const cycleCount = writable<number>(1); // Current pomodoro in cycle (1 to longBreakInterval)
export const pomodoroCount = writable<number>(loadPomodoroCount());
export const interval = writable<number | undefined>(undefined);

// Keep pomodoroCount synced with localStorage
if (typeof window !== 'undefined') {
	let initPomodoroSync = false;
	pomodoroCount.subscribe((count) => {
		if (!initPomodoroSync) {
			initPomodoroSync = true;
			return;
		}
		try {
			localStorage.setItem(POMODORO_COUNT_KEY, count.toString());
		} catch (e) {
			console.error('Error saving pomodoroCount:', e);
		}
	});
}

// Derived stores
export const isWorking = derived(mode, ($mode) => $mode === 'work');
export const isShortBreak = derived(mode, ($mode) => $mode === 'shortBreak');
export const isLongBreak = derived(mode, ($mode) => $mode === 'longBreak');

export const modeLabel = derived(mode, ($mode) => {
	switch ($mode) {
		case 'work':
			return 'Enfoque';
		case 'shortBreak':
			return 'Descanso Corto';
		case 'longBreak':
			return 'Descanso Largo';
	}
});

export const timerDisplay = derived(timeLeft, ($timeLeft) => {
	const totalSecs = Math.max(0, $timeLeft);
	const hours = Math.floor(totalSecs / 3600);
	const minutes = Math.floor((totalSecs % 3600) / 60);
	const seconds = totalSecs % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

export const progress = derived([timeLeft, duration], ([$timeLeft, $duration]) => {
	if ($duration <= 0) return 0;
	const elapsed = $duration - $timeLeft;
	const pct = Math.max(0, Math.min(100, (elapsed / $duration) * 100));
	return pct;
});

// Update document title and sync favicon
if (typeof window !== 'undefined') {
	timerDisplay.subscribe((display) => {
		const currentMode = get(mode);
		const running = get(isRunning);
		const icon = currentMode === 'work' ? '🍅' : '☕';
		const modeText = currentMode === 'work' ? 'Enfoque' : 'Descanso';
		if (running) {
			document.title = `${icon} ${display} - ${modeText} | Pomodoro`;
		} else {
			document.title = 'Pomodoro Task App';
		}
	});
}

// Sync durations when settings change (if timer is not running)
settings.subscribe(($settings) => {
	if (!get(isRunning)) {
		const currentMode = get(mode);
		let targetDuration = $settings.workDuration * 60;
		if (currentMode === 'shortBreak') targetDuration = $settings.shortBreakDuration * 60;
		if (currentMode === 'longBreak') targetDuration = $settings.longBreakDuration * 60;

		duration.set(targetDuration);
		timeLeft.set(targetDuration);
	}
});

function syncMobileControls(): void {
	if (typeof window === 'undefined') return;

	const running = get(isRunning);
	const currentMode = get(mode);
	const display = get(timerDisplay);
	const task = get(activeTask);

	updateMediaSession({
		title: task ? task.name : 'Sesión de Pomodoro',
		mode: currentMode,
		timeDisplay: display,
		isRunning: running,
		onPlay: () => startTimer(),
		onPause: () => stopTimer(),
		onNext: () => skipTimer(),
	});

	if (running) {
		requestWakeLock();
	} else {
		releaseWakeLock();
	}
}

/**
 * Switch timer mode cleanly
 */
export function switchMode(newMode: TimerMode, autoStart = false): void {
	stopTimer(false);
	mode.set(newMode);

	const userSettings = get(settings);
	let targetDuration = userSettings.workDuration * 60;
	if (newMode === 'shortBreak') targetDuration = userSettings.shortBreakDuration * 60;
	if (newMode === 'longBreak') targetDuration = userSettings.longBreakDuration * 60;

	duration.set(targetDuration);
	timeLeft.set(targetDuration);

	syncMobileControls();

	if (autoStart) {
		startTimer();
	}
}

/**
 * Timer tick handler
 */
export function updateTime(): void {
	const target = get(endTime);
	if (target === null) return;

	const remaining = Math.ceil((target - Date.now()) / 1000);
	timeLeft.set(Math.max(0, remaining));

	// Optional subtle ticking sound
	const currentSettings = get(settings);
	if (currentSettings.tickingSound && get(mode) === 'work' && remaining > 0) {
		playTickSound(0.08);
	}

	if (remaining <= 0) {
		handleSessionComplete();
	}
}

/**
 * Handle session completion logic
 */
export function handleSessionComplete(): void {
	stopTimer(false);

	const currentMode = get(mode);
	const userSettings = get(settings);

	// Play alarm sound
	playAlarmSound(userSettings.alarmSound, userSettings.alarmVolume);

	// Show system notification
	triggerNotification(currentMode);

	if (currentMode === 'work') {
		// Completed a focus session!
		pomodoroCount.update((c) => c + 1);
		recordCompletedPomodoro(userSettings.workDuration);
		incrementActiveTaskPomodoro();

		const currentCycle = get(cycleCount);
		const intervalLimit = Math.max(1, userSettings.longBreakInterval);

		if (currentCycle >= intervalLimit) {
			// Trigger Long Break
			cycleCount.set(1);
			switchMode('longBreak', userSettings.autoStartBreaks);
		} else {
			// Trigger Short Break
			cycleCount.update((c) => c + 1);
			switchMode('shortBreak', userSettings.autoStartBreaks);
		}
	} else {
		// Break finished! Return to work
		switchMode('work', userSettings.autoStartPomodoros);
	}
}

/**
 * Show desktop / mobile completion notification
 */
function triggerNotification(completedMode: TimerMode): void {
	if (typeof window === 'undefined') return;

	const isWork = completedMode === 'work';
	const title = isWork ? '🎉 ¡Sesión de enfoque completada!' : '⏰ ¡Fin del descanso!';
	const body = isWork
		? 'Excelente trabajo. Es momento de relajar la mente y estirarte.'
		: 'Tu mente está lista y despejada. ¡A por tu siguiente objetivo!';

	notifyGoDesktopNotification(title, body);

	if (!('Notification' in window) || Notification.permission !== 'granted') return;

	try {
		const icon = isWork ? '/imgs/rest.jpg' : '/imgs/focus.jpg';

		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				action: 'SHOW_NOTIFICATION',
				title,
				options: {
					body,
					icon,
					badge: '/imgs/icons/tomato.png',
					vibrate: [200, 100, 200, 100, 300],
					tag: 'pomodoro-session-ended',
					renotify: true,
					actions: [{ action: 'open_app', title: '🚀 Abrir App' }],
				},
			});
		} else {
			new Notification(title, {
				body,
				icon,
			});
		}
	} catch (e) {
		console.warn('Could not display notification:', e);
	}
}

/**
 * Start or resume countdown
 */
export function startTimer(): void {
	const currentInterval = get(interval);
	if (currentInterval) clearInterval(currentInterval);

	const remainingSecs = get(timeLeft);
	const targetEnd = Date.now() + remainingSecs * 1000;
	endTime.set(targetEnd);
	isRunning.set(true);

	if (typeof window !== 'undefined') {
		localStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
			end: targetEnd,
			mode: get(mode),
			duration: get(duration),
		}));
	}

	const newInterval = setInterval(updateTime, 1000) as unknown as number;
	interval.set(newInterval);

	syncMobileControls();

	// Notify Service Worker
	if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			action: 'START_TIMER',
			duration: remainingSecs,
			type: get(mode),
		});
	}
}

/**
 * Stop or pause countdown
 */
export function stopTimer(notifySw = true): void {
	const currentInterval = get(interval);
	if (currentInterval) clearInterval(currentInterval);
	interval.set(undefined);
	isRunning.set(false);
	endTime.set(null);

	if (typeof window !== 'undefined') {
		localStorage.removeItem(TIMER_STATE_KEY);
	}

	syncMobileControls();

	if (notifySw && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			action: 'STOP_TIMER',
		});
	}
}

/**
 * Toggle start/pause
 */
export function toggleTimer(): void {
	if (get(isRunning)) {
		stopTimer();
	} else {
		startTimer();
	}
}

/**
 * Reset current timer to mode duration
 */
export function resetTimer(): void {
	stopTimer();
	const currentMode = get(mode);
	const userSettings = get(settings);
	let targetDuration = userSettings.workDuration * 60;
	if (currentMode === 'shortBreak') targetDuration = userSettings.shortBreakDuration * 60;
	if (currentMode === 'longBreak') targetDuration = userSettings.longBreakDuration * 60;

	duration.set(targetDuration);
	timeLeft.set(targetDuration);

	if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			action: 'CLEAR_PROGRESS_NOTIFICATION',
		});
	}
}

/**
 * Skip current session to next mode
 */
export function skipTimer(): void {
	const currentMode = get(mode);
	if (currentMode === 'work') {
		const currentCycle = get(cycleCount);
		const userSettings = get(settings);
		if (currentCycle >= userSettings.longBreakInterval) {
			cycleCount.set(1);
			switchMode('longBreak', false);
		} else {
			cycleCount.update((c) => c + 1);
			switchMode('shortBreak', false);
		}
	} else {
		switchMode('work', false);
	}
}

/**
 * Add or subtract seconds to current timer
 */
export function addSeconds(seconds: number): void {
	timeLeft.update((curr) => {
		const newTime = Math.max(10, curr + seconds);
		duration.update((d) => Math.max(d, newTime));
		if (get(isRunning)) {
			endTime.set(Date.now() + newTime * 1000);
		}
		return newTime;
	});
	syncMobileControls();
}

/**
 * Sync state when restored from background / Service Worker
 */
export function syncFromServiceWorker(remaining: number, isWork: boolean, active: boolean): void {
	timeLeft.set(remaining);
	mode.set(isWork ? 'work' : 'shortBreak');
	isRunning.set(active);

	if (active) {
		endTime.set(Date.now() + remaining * 1000);
		const currentInterval = get(interval);
		if (currentInterval) clearInterval(currentInterval);
		const newInterval = setInterval(updateTime, 1000) as unknown as number;
		interval.set(newInterval);
	} else {
		const currentInterval = get(interval);
		if (currentInterval) clearInterval(currentInterval);
		interval.set(undefined);
	}

	syncMobileControls();
}

/**
 * Sync timer state from native Android Widget / Background Service
 */
export function syncTimerFromNative(nativeTimer: {
	mode: TimerMode;
	duration: number;
	timeLeft: number;
	isRunning: boolean;
	cycleCount: number;
	endTime?: number | null;
}): void {
	const currentInterval = get(interval);
	if (currentInterval) clearInterval(currentInterval);

	const nextMode: TimerMode =
		nativeTimer.mode === 'shortBreak' || nativeTimer.mode === 'longBreak'
			? nativeTimer.mode
			: 'work';
	const nextDuration = Math.max(60, nativeTimer.duration || 25 * 60);
	const nextCycle = Math.max(1, nativeTimer.cycleCount || 1);

	mode.set(nextMode);
	duration.set(nextDuration);
	cycleCount.set(nextCycle);

	if (nativeTimer.isRunning && nativeTimer.endTime && nativeTimer.endTime > Date.now()) {
		const remaining = Math.max(0, Math.ceil((nativeTimer.endTime - Date.now()) / 1000));
		timeLeft.set(remaining);
		endTime.set(nativeTimer.endTime);
		isRunning.set(true);
		const newInterval = setInterval(updateTime, 1000) as unknown as number;
		interval.set(newInterval);
	} else {
		const remaining = Math.max(0, nativeTimer.timeLeft ?? nextDuration);
		timeLeft.set(remaining);
		endTime.set(null);
		isRunning.set(false);
		interval.set(undefined);
	}

	syncMobileControls();
}

// Restore saved timer state on startup if app was closed while running
if (typeof window !== 'undefined') {
	try {
		const savedRaw = localStorage.getItem(TIMER_STATE_KEY);
		if (savedRaw) {
			const saved = JSON.parse(savedRaw);
			if (saved && saved.end && saved.end > Date.now()) {
				const remaining = Math.ceil((saved.end - Date.now()) / 1000);
				mode.set(saved.mode || 'work');
				duration.set(saved.duration || 25 * 60);
				timeLeft.set(remaining);
				endTime.set(saved.end);
				isRunning.set(true);
				const newInterval = setInterval(updateTime, 1000) as unknown as number;
				interval.set(newInterval);
				syncMobileControls();
			} else {
				localStorage.removeItem(TIMER_STATE_KEY);
			}
		}
	} catch (e) {
		console.error('Error recovering timer state:', e);
	}
}
