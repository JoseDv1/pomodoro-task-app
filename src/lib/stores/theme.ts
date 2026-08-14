import { writable, get, derived } from 'svelte/store';
import type { Theme } from '../types';

export const availableThemes: Theme[] = [
	{
		id: 'default-dark',
		name: 'Oscuro Clásico',
		description: 'Elegante y descansado para la vista, ideal para sesiones nocturnas.',
		previewColor: '#1e1e24',
		price: 0,
		unlocked: true,
		category: 'dark',
		cssProperties: {
			'--bg-primary': '#16161a',
			'--bg-secondary': '#242629',
			'--bg-tertiary': '#34383d',
			'--text-primary': '#fffffe',
			'--text-secondary': '#94a1b2',
			'--accent-color': '#ff6347',
			'--accent-hover': '#ff7f66',
			'--button-bg': '#242629',
			'--button-hover': '#34383d',
			'--card-bg': 'rgba(36, 38, 41, 0.75)',
			'--border-color': 'rgba(255, 255, 255, 0.1)',
			'--shadow-color': 'rgba(0, 0, 0, 0.4)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#ff6347',
			'--badge-bg': 'rgba(255, 99, 71, 0.15)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'default-light',
		name: 'Claro Cristal',
		description: 'Luminoso, limpio y fresco con alto contraste para el día.',
		previewColor: '#f8f9fa',
		price: 0,
		unlocked: true,
		category: 'light',
		cssProperties: {
			'--bg-primary': '#f4f6f9',
			'--bg-secondary': '#ffffff',
			'--bg-tertiary': '#e9ecef',
			'--text-primary': '#212529',
			'--text-secondary': '#6c757d',
			'--accent-color': '#e63946',
			'--accent-hover': '#f05360',
			'--button-bg': '#ffffff',
			'--button-hover': '#e9ecef',
			'--card-bg': 'rgba(255, 255, 255, 0.9)',
			'--border-color': 'rgba(0, 0, 0, 0.08)',
			'--shadow-color': 'rgba(0, 0, 0, 0.06)',
			'--ring-track': 'rgba(0, 0, 0, 0.08)',
			'--ring-progress': '#e63946',
			'--badge-bg': 'rgba(230, 57, 70, 0.12)',
			'color-scheme': 'light'
		}
	},
	{
		id: 'forest-zen',
		name: 'Bosque Zen',
		description: 'Tonalidades verdes naturales inspiradas en la calma del bosque.',
		previewColor: '#1d3124',
		price: 5,
		unlocked: false,
		category: 'dark',
		cssProperties: {
			'--bg-primary': '#142219',
			'--bg-secondary': '#1e3326',
			'--bg-tertiary': '#2a4735',
			'--text-primary': '#e8f5e9',
			'--text-secondary': '#a5d6a7',
			'--accent-color': '#66bb6a',
			'--accent-hover': '#81c784',
			'--button-bg': '#1e3326',
			'--button-hover': '#2a4735',
			'--card-bg': 'rgba(30, 51, 38, 0.8)',
			'--border-color': 'rgba(102, 187, 106, 0.2)',
			'--shadow-color': 'rgba(0, 0, 0, 0.4)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#66bb6a',
			'--badge-bg': 'rgba(102, 187, 106, 0.15)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'ocean-blue',
		name: 'Océano Profundo',
		description: 'Azul zafiro inmersivo para máxima concentración y claridad mental.',
		previewColor: '#0f172a',
		price: 8,
		unlocked: false,
		category: 'dark',
		cssProperties: {
			'--bg-primary': '#0a0f1d',
			'--bg-secondary': '#131e36',
			'--bg-tertiary': '#1e2d4e',
			'--text-primary': '#f0f6fc',
			'--text-secondary': '#93b4d7',
			'--accent-color': '#38bdf8',
			'--accent-hover': '#60a5fa',
			'--button-bg': '#131e36',
			'--button-hover': '#1e2d4e',
			'--card-bg': 'rgba(19, 30, 54, 0.8)',
			'--border-color': 'rgba(56, 189, 248, 0.2)',
			'--shadow-color': 'rgba(0, 0, 0, 0.45)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#38bdf8',
			'--badge-bg': 'rgba(56, 189, 248, 0.15)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'cyber-neon',
		name: 'Neón Cibernético',
		description: 'Vibraciones synthwave cyberpunk con detalles en cian y fucsia.',
		previewColor: '#0d0d17',
		price: 12,
		unlocked: false,
		category: 'colorful',
		cssProperties: {
			'--bg-primary': '#0a0914',
			'--bg-secondary': '#16132b',
			'--bg-tertiary': '#241f45',
			'--text-primary': '#f8f9fa',
			'--text-secondary': '#c4b5fd',
			'--accent-color': '#06b6d4',
			'--accent-hover': '#22d3ee',
			'--button-bg': '#16132b',
			'--button-hover': '#241f45',
			'--card-bg': 'rgba(22, 19, 43, 0.85)',
			'--border-color': 'rgba(6, 182, 212, 0.25)',
			'--shadow-color': 'rgba(0, 0, 0, 0.5)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#06b6d4',
			'--badge-bg': 'rgba(6, 182, 212, 0.18)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'golden-sunset',
		name: 'Atardecer Dorado',
		description: 'Cálidos matices dorados y ámbar que inspiran creatividad.',
		previewColor: '#2b1b11',
		price: 15,
		unlocked: false,
		category: 'colorful',
		cssProperties: {
			'--bg-primary': '#1d120a',
			'--bg-secondary': '#2e1c12',
			'--bg-tertiary': '#442a1b',
			'--text-primary': '#fff3e0',
			'--text-secondary': '#ffcc80',
			'--accent-color': '#f59e0b',
			'--accent-hover': '#fbbf24',
			'--button-bg': '#2e1c12',
			'--button-hover': '#442a1b',
			'--card-bg': 'rgba(46, 28, 18, 0.8)',
			'--border-color': 'rgba(245, 158, 11, 0.25)',
			'--shadow-color': 'rgba(0, 0, 0, 0.4)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#f59e0b',
			'--badge-bg': 'rgba(245, 158, 11, 0.15)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'sakura-pink',
		name: 'Cerezo Sakura',
		description: 'Delicado tema primaveral con suaves tonos rosa y flor de cerezo.',
		previewColor: '#fff0f3',
		price: 18,
		unlocked: false,
		category: 'light',
		cssProperties: {
			'--bg-primary': '#fff5f7',
			'--bg-secondary': '#ffffff',
			'--bg-tertiary': '#ffe3e8',
			'--text-primary': '#592938',
			'--text-secondary': '#8c485e',
			'--accent-color': '#e64980',
			'--accent-hover': '#f06595',
			'--button-bg': '#ffffff',
			'--button-hover': '#ffe3e8',
			'--card-bg': 'rgba(255, 255, 255, 0.92)',
			'--border-color': 'rgba(230, 73, 128, 0.18)',
			'--shadow-color': 'rgba(230, 73, 128, 0.08)',
			'--ring-track': 'rgba(230, 73, 128, 0.1)',
			'--ring-progress': '#e64980',
			'--badge-bg': 'rgba(230, 73, 128, 0.12)',
			'color-scheme': 'light'
		}
	},
	{
		id: 'midnight-amethyst',
		name: 'Amatista Mística',
		description: 'Misterioso púrpura medianoche con acentos radiantes de amatista.',
		previewColor: '#1a102f',
		price: 20,
		unlocked: false,
		category: 'dark',
		cssProperties: {
			'--bg-primary': '#110a20',
			'--bg-secondary': '#1d1235',
			'--bg-tertiary': '#2d1c52',
			'--text-primary': '#f3e8ff',
			'--text-secondary': '#c084fc',
			'--accent-color': '#a855f7',
			'--accent-hover': '#c084fc',
			'--button-bg': '#1d1235',
			'--button-hover': '#2d1c52',
			'--card-bg': 'rgba(29, 18, 53, 0.85)',
			'--border-color': 'rgba(168, 85, 247, 0.25)',
			'--shadow-color': 'rgba(0, 0, 0, 0.45)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#a855f7',
			'--badge-bg': 'rgba(168, 85, 247, 0.18)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'cozy-coffee',
		name: 'Café de Especialidad',
		description: 'Aromático y acogedor, como tu cafetería favorita de trabajo.',
		previewColor: '#2b2118',
		price: 22,
		unlocked: false,
		category: 'dark',
		cssProperties: {
			'--bg-primary': '#1c150f',
			'--bg-secondary': '#2c221a',
			'--bg-tertiary': '#403227',
			'--text-primary': '#f7f1eb',
			'--text-secondary': '#d0bcad',
			'--accent-color': '#d97706',
			'--accent-hover': '#f59e0b',
			'--button-bg': '#2c221a',
			'--button-hover': '#403227',
			'--card-bg': 'rgba(44, 34, 26, 0.85)',
			'--border-color': 'rgba(217, 119, 6, 0.2)',
			'--shadow-color': 'rgba(0, 0, 0, 0.4)',
			'--ring-track': 'rgba(255, 255, 255, 0.08)',
			'--ring-progress': '#d97706',
			'--badge-bg': 'rgba(217, 119, 6, 0.15)',
			'color-scheme': 'dark'
		}
	},
	{
		id: 'matcha-tea',
		name: 'Té Matcha',
		description: 'Paz y armonía con suaves tonos de té verde japonés y crema.',
		previewColor: '#eef3eb',
		price: 25,
		unlocked: false,
		category: 'light',
		cssProperties: {
			'--bg-primary': '#f3f6f1',
			'--bg-secondary': '#ffffff',
			'--bg-tertiary': '#e2ebdcf0',
			'--text-primary': '#2a3b26',
			'--text-secondary': '#577350',
			'--accent-color': '#4d7c0f',
			'--accent-hover': '#65a30d',
			'--button-bg': '#ffffff',
			'--button-hover': '#e2ebdc',
			'--card-bg': 'rgba(255, 255, 255, 0.92)',
			'--border-color': 'rgba(77, 124, 15, 0.18)',
			'--shadow-color': 'rgba(77, 124, 15, 0.06)',
			'--ring-track': 'rgba(77, 124, 15, 0.1)',
			'--ring-progress': '#4d7c0f',
			'--badge-bg': 'rgba(77, 124, 15, 0.12)',
			'color-scheme': 'light'
		}
	}
];

function loadUnlockedThemes(): Theme[] {
	if (typeof window === 'undefined') return availableThemes;
	try {
		const raw = localStorage.getItem('unlockedThemes');
		if (!raw) return availableThemes;
		const unlockedIds: string[] = JSON.parse(raw);
		return availableThemes.map((t) => ({
			...t,
			unlocked: t.unlocked || unlockedIds.includes(t.id),
		}));
	} catch (e) {
		console.error('Error loading unlocked themes:', e);
		return availableThemes;
	}
}

function getInitialThemeId(): string {
	if (typeof window === 'undefined') return 'default-dark';
	const saved = localStorage.getItem('activeThemeId');
	if (saved) {
		const all = loadUnlockedThemes();
		const match = all.find((t) => t.id === saved && t.unlocked);
		if (match) return saved;
	}
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
		? 'default-light'
		: 'default-dark';
}

export const themes = writable<Theme[]>(loadUnlockedThemes());
export const activeThemeId = writable<string>(getInitialThemeId());

export const activeTheme = derived(
	[themes, activeThemeId],
	([$themes, $activeThemeId]) => {
		return $themes.find((t) => t.id === $activeThemeId) || $themes[0];
	}
);

export function applyThemeProperties(theme: Theme): void {
	if (typeof document === 'undefined' || !theme) return;
	const root = document.documentElement;
	Object.entries(theme.cssProperties).forEach(([prop, val]) => {
		if (prop === 'color-scheme') {
			root.style.colorScheme = val;
		} else {
			root.style.setProperty(prop, val);
		}
	});

	if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
		const metaThemeColor = document.getElementById('theme-color-meta');
		if (metaThemeColor && theme.cssProperties['--bg-primary']) {
			metaThemeColor.setAttribute('content', theme.cssProperties['--bg-primary']);
		}
	}
}

export function setTheme(themeId: string): void {
	themes.update((all) => {
		const target = all.find((t) => t.id === themeId);
		if (target && target.unlocked) {
			activeThemeId.set(themeId);
			if (typeof window !== 'undefined') {
				localStorage.setItem('activeThemeId', themeId);
			}
			applyThemeProperties(target);
		}
		return all;
	});
}

export function unlockTheme(themeId: string, currentBalance: number): boolean {
	const all = get(themes);
	const target = all.find((t) => t.id === themeId);
	if (!target || target.unlocked) return false;
	if (currentBalance < target.price) return false;

	themes.update((current) => {
		const updated = current.map((t) => (t.id === themeId ? { ...t, unlocked: true } : t));
		if (typeof window !== 'undefined') {
			const unlockedList = updated.filter((t) => t.unlocked).map((t) => t.id);
			localStorage.setItem('unlockedThemes', JSON.stringify(unlockedList));
		}
		return updated;
	});

	setTheme(themeId);
	return true;
}

if (typeof window !== 'undefined') {
	activeTheme.subscribe((t) => {
		if (t) applyThemeProperties(t);
	});
}
