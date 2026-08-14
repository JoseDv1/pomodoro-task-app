import { writable } from 'svelte/store';
import type { UserSettings } from '../types';
import { setAmbientSound, updateAmbientVolume } from '../utils/ambientSound';

const STORAGE_KEY = 'pomodoro_user_settings';

export const defaultSettings: UserSettings = {
	workDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakInterval: 4,
	autoStartBreaks: false,
	autoStartPomodoros: false,
	alarmSound: 'bell',
	alarmVolume: 0.7,
	tickingSound: false,
	ambientSound: 'off',
	ambientVolume: 0.5,
	notificationsEnabled: false,
	keepScreenAwake: true,
};

function loadSettings(): UserSettings {
	if (typeof window === 'undefined') return defaultSettings;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultSettings;
		return { ...defaultSettings, ...JSON.parse(raw) };
	} catch (e) {
		console.error('Error loading settings from localStorage:', e);
		return defaultSettings;
	}
}

export const settings = writable<UserSettings>(loadSettings());

if (typeof window !== 'undefined') {
	settings.subscribe((val) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
		} catch (e) {
			console.error('Error saving settings to localStorage:', e);
		}
	});
}

export function updateSettings(partial: Partial<UserSettings>): void {
	settings.update((current) => {
		const updated = { ...current, ...partial };
		
		// If ambient sound or volume changed, update audio generator
		if (partial.ambientSound !== undefined || partial.ambientVolume !== undefined) {
			if (updated.ambientSound === 'off') {
				setAmbientSound('off');
			} else {
				setAmbientSound(updated.ambientSound, updated.ambientVolume);
			}
		}
		
		return updated;
	});
}

export function resetSettingsToDefaults(): void {
	settings.set(defaultSettings);
	setAmbientSound('off');
}
