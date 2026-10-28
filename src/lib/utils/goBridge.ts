import { get } from 'svelte/store';
import type { AlarmSoundId, AmbientSoundId, Stats, Task, TimerMode, UserSettings } from '../types';
import { settings } from '../stores/settings';
import { stats } from '../stores/stats';
import { activeTaskId, tasks } from '../stores/task';
import { activeThemeId, applyThemeProperties, availableThemes, themes } from '../stores/theme';
import {
	cycleCount,
	duration,
	endTime,
	isRunning,
	mode,
	pomodoroCount,
	syncTimerFromNative,
	timeLeft,
} from '../stores/timer';

interface AndroidNativeBridge {
	getState(): string;
	syncState(rawJSON: string): void;
	playAlarm(soundId: string, volume: number): void;
	playTick(volume: number): void;
	setAmbient(soundId: string, volume: number, active: boolean): void;
	setWindowTheme(bgHex: string, isDark: boolean): void;
	setWakeLock(enabled: boolean): void;
	notify(title: string, body: string): void;
}

declare global {
	interface Window {
		AndroidNative?: AndroidNativeBridge;
		__onAndroidNativeStateUpdated?: () => void;
		goNativeGetState?: () => Promise<string> | string;
		goNativeSyncState?: (rawJSON: string) => Promise<void> | void;
		goNativePlayAlarm?: (soundId: string, volume: number) => Promise<void> | void;
		goNativePlayTick?: (volume: number) => Promise<void> | void;
		goNativeSetAmbient?: (soundId: string, volume: number, active: boolean) => Promise<void> | void;
		goNativeSetWindowTheme?: (bgHex: string, isDark: boolean) => Promise<void> | void;
		goNativeSetWakeLock?: (enabled: boolean) => Promise<void> | void;
		goNativeNotify?: (title: string, body: string) => Promise<void> | void;
	}
}

interface GoPersistedState {
	settings: UserSettings;
	tasks: Task[];
	activeTaskId: string;
	pomodoroCount: number;
	stats: Stats;
	activeThemeId: string;
	unlockedThemes: string[];
	timer?: {
		mode: TimerMode;
		duration: number;
		timeLeft: number;
		isRunning: boolean;
		cycleCount: number;
		endTime?: number | null;
	};
}

var goBackendAvailable = false;
var hydrating = false;
var syncTimeout: ReturnType<typeof setTimeout> | null = null;
var lastSyncedJSON = '';

export function isGoBackendActive(): boolean {
	return goBackendAvailable;
}

async function postRawJSON(path: string, rawJSON: string): Promise<boolean> {
	if (!goBackendAvailable) return false;
	try {
		const res = await fetch(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: rawJSON,
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function postJSON(path: string, body: unknown): Promise<boolean> {
	return postRawJSON(path, JSON.stringify(body));
}

function collectCurrentState(): GoPersistedState {
	const currentThemes = get(themes);
	const unlockedIds: string[] = [];
	for (let i = 0; i < currentThemes.length; i++) {
		if (currentThemes[i].unlocked) {
			unlockedIds.push(currentThemes[i].id);
		}
	}

	const rawTasks = get(tasks);
	const mappedTasks = new Array<Task>(rawTasks.length);
	for (let i = 0; i < rawTasks.length; i++) {
		const t = rawTasks[i];
		mappedTasks[i] = {
			...t,
			completedAt: t.completedAt || undefined,
		};
	}

	return {
		settings: get(settings),
		tasks: mappedTasks,
		activeTaskId: get(activeTaskId) || '',
		pomodoroCount: get(pomodoroCount),
		stats: get(stats),
		activeThemeId: get(activeThemeId),
		unlockedThemes: unlockedIds,
		timer: {
			mode: get(mode),
			duration: get(duration),
			timeLeft: get(timeLeft),
			isRunning: get(isRunning),
			cycleCount: get(cycleCount),
			endTime: get(endTime),
		},
	};
}

function pushStateToGo(): void {
	const rawJSON = JSON.stringify(collectCurrentState());
	if (rawJSON === lastSyncedJSON) return;
	lastSyncedJSON = rawJSON;

	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.syncState === 'function') {
			window.AndroidNative.syncState(rawJSON);
			return;
		}
		if (typeof window.goNativeSyncState === 'function') {
			void window.goNativeSyncState(rawJSON);
			return;
		}
	}
	void postRawJSON('/api/state', rawJSON);
}

function scheduleStateSync(): void {
	if (!goBackendAvailable || hydrating) return;
	if (syncTimeout) clearTimeout(syncTimeout);
	syncTimeout = setTimeout(pushStateToGo, 60);
}

function applyNativeDataToStores(data: GoPersistedState): void {
	hydrating = true;
	try {
		if (data.settings) {
			settings.set(data.settings);
		}
		if (Array.isArray(data.tasks)) {
			tasks.set(
				data.tasks.map((t) => ({
					...t,
					completedAt: t.completedAt ?? null,
				}))
			);
		}
		activeTaskId.set(data.activeTaskId || null);
		if (typeof data.pomodoroCount === 'number') {
			pomodoroCount.set(data.pomodoroCount);
		}
		if (data.stats) {
			stats.set({
				totalFocusMinutes: data.stats.totalFocusMinutes || 0,
				totalPomodoros: data.stats.totalPomodoros || 0,
				currentStreak: data.stats.currentStreak || 0,
				bestStreak: data.stats.bestStreak || 0,
				lastActiveDate: data.stats.lastActiveDate || '',
				history: data.stats.history || {},
			});
		}
		if (Array.isArray(data.unlockedThemes)) {
			const unlockedSet = new Set(data.unlockedThemes);
			const updatedThemes = availableThemes.map((t) => ({
				...t,
				unlocked: t.unlocked || unlockedSet.has(t.id),
			}));
			themes.set(updatedThemes);

			if (data.activeThemeId) {
				const found = updatedThemes.find((t) => t.id === data.activeThemeId && t.unlocked);
				if (found) {
					activeThemeId.set(found.id);
					applyThemeProperties(found);
				}
			}
		}
		if (data.timer) {
			syncTimerFromNative(data.timer);
		}
		lastSyncedJSON = JSON.stringify(collectCurrentState());
	} finally {
		hydrating = false;
	}
}

export async function initGoBridge(): Promise<void> {
	if (typeof window === 'undefined') return;

	try {
		let data: GoPersistedState;
		if (window.AndroidNative && typeof window.AndroidNative.getState === 'function') {
			const raw = window.AndroidNative.getState();
			data = (raw ? JSON.parse(raw) : {}) as GoPersistedState;
		} else if (typeof window.goNativeGetState === 'function') {
			const raw = await window.goNativeGetState();
			data = JSON.parse(raw) as GoPersistedState;
		} else {
			const res = await fetch('/api/state', { method: 'GET' });
			if (!res.ok) return;
			data = (await res.json()) as GoPersistedState;
		}
		goBackendAvailable = true;

		const hasGoData =
			(Array.isArray(data.tasks) && data.tasks.length > 0) ||
			data.pomodoroCount > 0 ||
			(data.stats && data.stats.totalPomodoros > 0) ||
			(data.activeThemeId && data.activeThemeId !== 'default-dark') ||
			Boolean(data.timer && (data.timer.isRunning || data.timer.mode !== 'work'));

		hydrating = true;
		if (hasGoData) {
			applyNativeDataToStores(data);
			hydrating = true;
		} else {
			pushStateToGo();
		}

		// Callback global para sincronizar acciones disparadas desde el Widget de Inicio de Android
		window.__onAndroidNativeStateUpdated = () => {
			if (!window.AndroidNative || typeof window.AndroidNative.getState !== 'function') return;
			try {
				const raw = window.AndroidNative.getState();
				if (!raw || raw === lastSyncedJSON) return;
				const parsed = JSON.parse(raw) as GoPersistedState;
				applyNativeDataToStores(parsed);
			} catch {
				// ignore malformed state
			}
		};

		// Suscribir cambios reactivos de Svelte hacia el Core nativo (mientras hydrating=true ignora el disparo inicial síncrono)
		settings.subscribe(() => scheduleStateSync());
		tasks.subscribe(() => scheduleStateSync());
		activeTaskId.subscribe(() => scheduleStateSync());
		pomodoroCount.subscribe(() => scheduleStateSync());
		stats.subscribe(() => scheduleStateSync());
		mode.subscribe(() => scheduleStateSync());
		duration.subscribe(() => scheduleStateSync());
		isRunning.subscribe(() => scheduleStateSync());
		endTime.subscribe(() => scheduleStateSync());
		cycleCount.subscribe(() => scheduleStateSync());
		activeThemeId.subscribe((tid) => {
			scheduleStateSync();
			const th = get(themes).find((t) => t.id === tid) || availableThemes[0];
			if (th) {
				notifyGoWindowTheme(
					th.cssProperties['--bg-primary'] || '#16161a',
					th.cssProperties['color-scheme'] !== 'light'
				);
			}
		});
		themes.subscribe(() => scheduleStateSync());
		hydrating = false;
	} catch {
		hydrating = false;
		goBackendAvailable = false;
	}
}

export function notifyGoAudioAlarm(soundId: AlarmSoundId, volume: number): boolean {
	if (!goBackendAvailable) return false;
	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.playAlarm === 'function') {
			window.AndroidNative.playAlarm(soundId, volume);
			return true;
		}
		if (typeof window.goNativePlayAlarm === 'function') {
			void window.goNativePlayAlarm(soundId, volume);
			return true;
		}
	}
	void postJSON('/api/audio/alarm', { soundId, volume });
	return true;
}

export function notifyGoAudioTick(volume: number): boolean {
	if (!goBackendAvailable) return false;
	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.playTick === 'function') {
			window.AndroidNative.playTick(volume);
			return true;
		}
		if (typeof window.goNativePlayTick === 'function') {
			void window.goNativePlayTick(volume);
			return true;
		}
	}
	void postJSON('/api/audio/tick', { volume });
	return true;
}

export function notifyGoAudioAmbient(soundId: AmbientSoundId, volume: number, active: boolean): boolean {
	if (!goBackendAvailable) return false;
	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.setAmbient === 'function') {
			window.AndroidNative.setAmbient(soundId, volume, active);
			return true;
		}
		if (typeof window.goNativeSetAmbient === 'function') {
			void window.goNativeSetAmbient(soundId, volume, active);
			return true;
		}
	}
	void postJSON('/api/audio/ambient', { soundId, volume, active });
	return true;
}

export function notifyGoWindowTheme(bgHex: string, isDark: boolean): void {
	if (!goBackendAvailable) return;
	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.setWindowTheme === 'function') {
			window.AndroidNative.setWindowTheme(bgHex, isDark);
			return;
		}
		if (typeof window.goNativeSetWindowTheme === 'function') {
			void window.goNativeSetWindowTheme(bgHex, isDark);
			return;
		}
	}
	void postJSON('/api/window/theme', { bgHex, isDark });
}

export function notifyGoWakeLock(enabled: boolean): void {
	if (!goBackendAvailable) return;
	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.setWakeLock === 'function') {
			window.AndroidNative.setWakeLock(enabled);
			return;
		}
		if (typeof window.goNativeSetWakeLock === 'function') {
			void window.goNativeSetWakeLock(enabled);
			return;
		}
	}
	void postJSON('/api/window/awake', { enabled });
}

export function notifyGoDesktopNotification(title: string, body: string): void {
	if (!goBackendAvailable) return;
	if (typeof window !== 'undefined') {
		if (window.AndroidNative && typeof window.AndroidNative.notify === 'function') {
			window.AndroidNative.notify(title, body);
			return;
		}
		if (typeof window.goNativeNotify === 'function') {
			void window.goNativeNotify(title, body);
			return;
		}
	}
	void postJSON('/api/notify', { title, body });
}
