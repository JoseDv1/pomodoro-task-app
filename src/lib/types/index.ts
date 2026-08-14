export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
	id: string;
	name: string;
	completed: boolean;
	estimatedPomodoros: number;
	completedPomodoros: number;
	priority: TaskPriority;
	category?: string;
	createdAt: string;
	completedAt?: string | null;
}

export type AlarmSoundId = 'bell' | 'chime' | 'digital' | 'gong' | 'marimba' | 'retro' | 'classic';

export type AmbientSoundId = 'off' | 'rain' | 'whitenoise' | 'brownnoise' | 'stream';

export interface UserSettings {
	workDuration: number; // in minutes
	shortBreakDuration: number; // in minutes
	longBreakDuration: number; // in minutes
	longBreakInterval: number; // pomodoros count before long break
	autoStartBreaks: boolean;
	autoStartPomodoros: boolean;
	alarmSound: AlarmSoundId;
	alarmVolume: number;
	tickingSound: boolean;
	ambientSound: AmbientSoundId;
	ambientVolume: number;
	notificationsEnabled: boolean;
	keepScreenAwake: boolean;
}

export interface DayStats {
	minutes: number;
	pomodoros: number;
	tasksCompleted: number;
}

export interface Stats {
	totalFocusMinutes: number;
	totalPomodoros: number;
	currentStreak: number;
	bestStreak: number;
	lastActiveDate: string; // YYYY-MM-DD
	history: Record<string, DayStats>;
}

export interface Theme {
	id: string;
	name: string;
	description: string;
	previewColor: string;
	price: number;
	unlocked: boolean;
	category?: 'dark' | 'light' | 'colorful' | 'special';
	cssProperties: Record<string, string>;
}
