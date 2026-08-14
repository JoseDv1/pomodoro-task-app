import { writable, derived } from 'svelte/store';
import type { Stats, DayStats } from '../types';

const STATS_STORAGE_KEY = 'pomodoro_user_stats';

function getTodayKey(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function getYesterdayKey(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

const defaultStats: Stats = {
	totalFocusMinutes: 0,
	totalPomodoros: 0,
	currentStreak: 0,
	bestStreak: 0,
	lastActiveDate: '',
	history: {},
};

function loadStats(): Stats {
	if (typeof window === 'undefined') return defaultStats;
	try {
		const raw = localStorage.getItem(STATS_STORAGE_KEY);
		if (!raw) return defaultStats;
		const parsed = JSON.parse(raw) as Stats;
		
		// Check if streak was broken (last active was before yesterday)
		const today = getTodayKey();
		const yesterday = getYesterdayKey();
		if (parsed.lastActiveDate && parsed.lastActiveDate !== today && parsed.lastActiveDate !== yesterday) {
			parsed.currentStreak = 0;
		}
		
		return { ...defaultStats, ...parsed };
	} catch (e) {
		console.error('Error loading stats:', e);
		return defaultStats;
	}
}

export const stats = writable<Stats>(loadStats());

if (typeof window !== 'undefined') {
	stats.subscribe((val) => {
		try {
			localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(val));
		} catch (e) {
			console.error('Error saving stats:', e);
		}
	});
}

/**
 * Record a completed pomodoro session (adds focus minutes and updates streak)
 */
export function recordCompletedPomodoro(minutes: number): void {
	const today = getTodayKey();
	const yesterday = getYesterdayKey();

	stats.update((curr) => {
		const dayData: DayStats = curr.history[today] || { minutes: 0, pomodoros: 0, tasksCompleted: 0 };
		const updatedDayData: DayStats = {
			...dayData,
			minutes: dayData.minutes + minutes,
			pomodoros: dayData.pomodoros + 1,
		};

		let newStreak = curr.currentStreak;
		if (curr.lastActiveDate === yesterday) {
			newStreak += 1;
		} else if (curr.lastActiveDate !== today) {
			newStreak = 1;
		}

		const bestStreak = Math.max(curr.bestStreak, newStreak);

		return {
			...curr,
			totalFocusMinutes: curr.totalFocusMinutes + minutes,
			totalPomodoros: curr.totalPomodoros + 1,
			currentStreak: newStreak,
			bestStreak,
			lastActiveDate: today,
			history: {
				...curr.history,
				[today]: updatedDayData,
			},
		};
	});
}

/**
 * Record a completed task in daily history
 */
export function recordCompletedTask(): void {
	const today = getTodayKey();
	stats.update((curr) => {
		const dayData: DayStats = curr.history[today] || { minutes: 0, pomodoros: 0, tasksCompleted: 0 };
		return {
			...curr,
			history: {
				...curr.history,
				[today]: {
					...dayData,
					tasksCompleted: dayData.tasksCompleted + 1,
				},
			},
		};
	});
}

/**
 * Derived store for today's summary stats
 */
export const todayStats = derived(stats, ($stats) => {
	const today = getTodayKey();
	return $stats.history[today] || { minutes: 0, pomodoros: 0, tasksCompleted: 0 };
});

/**
 * Derived store for the last 7 days of activity
 */
export const weeklyActivity = derived(stats, ($stats) => {
	const days: { date: string; label: string; minutes: number; pomodoros: number }[] = [];
	const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	for (let i = 6; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const key = `${year}-${month}-${day}`;
		const data = $stats.history[key] || { minutes: 0, pomodoros: 0, tasksCompleted: 0 };
		
		days.push({
			date: key,
			label: dayNames[d.getDay()],
			minutes: data.minutes,
			pomodoros: data.pomodoros,
		});
	}

	return days;
});
