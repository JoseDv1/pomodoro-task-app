import { writable, get, derived } from 'svelte/store';
import { pomodoroCount } from './timer';

// Definir una interfaz para los temas
export interface Theme {
	id: string;
	name: string;
	description: string;
	previewColor: string;
	price: number;
	unlocked: boolean;
	cssProperties: Record<string, string>;
}

// Definir los temas disponibles
export const availableThemes: Theme[] = [
	{
		id: 'default-dark',
		name: 'Oscuro Clásico',
		description: 'El tema oscuro predeterminado para concentrarse en ambientes con poca luz.',
		previewColor: '#242424',
		price: 0,
		unlocked: true,
		cssProperties: {
			'--bg-primary': '#242424',
			'--bg-secondary': '#1a1a1a',
			'--bg-tertiary': '#333333',
			'--text-primary': 'rgba(255, 255, 255, 0.87)',
			'--text-secondary': 'rgba(255, 255, 255, 0.6)',
			'--accent-color': '#ff6347',
			'--button-bg': '#333333',
			'--button-hover': '#444444',
			'--card-bg': 'rgba(255, 255, 255, 0.1)',
			'--border-color': 'rgba(255, 255, 255, 0.1)',
			'--shadow-color': 'rgba(0, 0, 0, 0.3)'
		}
	},
	{
		id: 'default-light',
		name: 'Claro Clásico',
		description: 'El tema claro predeterminado para ambientes bien iluminados.',
		previewColor: '#f5f5f5',
		price: 0,
		unlocked: true,
		cssProperties: {
			'--bg-primary': '#f5f5f5',
			'--bg-secondary': '#e8e8e8',
			'--bg-tertiary': '#d1d1d1',
			'--text-primary': '#213547',
			'--text-secondary': '#4a4a4a',
			'--accent-color': '#ff6347',
			'--button-bg': '#e0e0e0',
			'--button-hover': '#d0d0d0',
			'--card-bg': 'rgba(0, 0, 0, 0.05)',
			'--border-color': 'rgba(0, 0, 0, 0.1)',
			'--shadow-color': 'rgba(0, 0, 0, 0.1)'
		}
	},
	{
		id: 'nature-green',
		name: 'Verde Naturaleza',
		description: 'Tema inspirado en la naturaleza para un ambiente tranquilo y relajante.',
		previewColor: '#2c3e2e',
		price: 5,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#2c3e2e',
			'--bg-secondary': '#1e2b20',
			'--bg-tertiary': '#3a5240',
			'--text-primary': '#e0ede0',
			'--text-secondary': '#bcd0bc',
			'--accent-color': '#8fbc8f',
			'--button-bg': '#3a5240',
			'--button-hover': '#4a624c',
			'--card-bg': 'rgba(255, 255, 255, 0.1)',
			'--border-color': 'rgba(255, 255, 255, 0.15)',
			'--shadow-color': 'rgba(0, 0, 0, 0.3)'
		}
	},
	{
		id: 'ocean-blue',
		name: 'Azul Océano',
		description: 'Tema inspirado en las profundidades del mar para una concentración profunda.',
		previewColor: '#1a3a5f',
		price: 10,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#1a3a5f',
			'--bg-secondary': '#0f2440',
			'--bg-tertiary': '#2a4d74',
			'--text-primary': '#e0f0ff',
			'--text-secondary': '#b0d0f0',
			'--accent-color': '#4d94ff',
			'--button-bg': '#2a4d74',
			'--button-hover': '#396088',
			'--card-bg': 'rgba(255, 255, 255, 0.1)',
			'--border-color': 'rgba(255, 255, 255, 0.15)',
			'--shadow-color': 'rgba(0, 0, 0, 0.3)'
		}
	},
	{
		id: 'sunset-orange',
		name: 'Atardecer',
		description: 'Tema inspirado en un cálido atardecer para terminar el día productivamente.',
		previewColor: '#4a3833',
		price: 15,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#4a3833',
			'--bg-secondary': '#382a27',
			'--bg-tertiary': '#5c4840',
			'--text-primary': '#ffe0d1',
			'--text-secondary': '#dbbcb0',
			'--accent-color': '#ff7f50',
			'--button-bg': '#5c4840',
			'--button-hover': '#6d5a50',
			'--card-bg': 'rgba(255, 255, 255, 0.1)',
			'--border-color': 'rgba(255, 255, 255, 0.15)',
			'--shadow-color': 'rgba(0, 0, 0, 0.3)'
		}
	},
	{
		id: 'bubblegum',
		name: 'Chicle',
		description: 'Un tema divertido y colorido para mantener la energía alta.',
		previewColor: '#ffb6c1',
		price: 20,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#ffb6c1',
			'--bg-secondary': '#ffc1d0',
			'--bg-tertiary': '#ffaabb',
			'--text-primary': '#4a2d38',
			'--text-secondary': '#6d4458',
			'--accent-color': '#ff69b4',
			'--button-bg': '#ffaabb',
			'--button-hover': '#ff9bb0',
			'--card-bg': 'rgba(255, 255, 255, 0.3)',
			'--border-color': 'rgba(255, 255, 255, 0.3)',
			'--shadow-color': 'rgba(0, 0, 0, 0.1)'
		}
	},
	{
		id: 'pastel-green',
		name: 'Verde Pastel',
		description: 'Un suave tema verde pastel para crear un ambiente relajado y tranquilo.',
		previewColor: '#c1e1c1',
		price: 12,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#c1e1c1',
			'--bg-secondary': '#d5ebd5',
			'--bg-tertiary': '#b3d8b3',
			'--text-primary': '#2c4c2c',
			'--text-secondary': '#3b633b',
			'--accent-color': '#5cb85c',
			'--button-bg': '#b3d8b3',
			'--button-hover': '#a0cda0',
			'--card-bg': 'rgba(255, 255, 255, 0.4)',
			'--border-color': 'rgba(0, 0, 0, 0.1)',
			'--shadow-color': 'rgba(0, 0, 0, 0.1)'
		}
	},
	{
		id: 'ruby-red',
		name: 'Rubí',
		description: 'Un vibrante tema rojo para potenciar la energía y la motivación.',
		previewColor: '#8B0000',
		price: 18,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#8B0000',
			'--bg-secondary': '#700000',
			'--bg-tertiary': '#A50000',
			'--text-primary': '#FFE4E1',
			'--text-secondary': '#FFC0CB',
			'--accent-color': '#FF4500',
			'--button-bg': '#A50000',
			'--button-hover': '#BF0000',
			'--card-bg': 'rgba(255, 255, 255, 0.1)',
			'--border-color': 'rgba(255, 255, 255, 0.15)',
			'--shadow-color': 'rgba(0, 0, 0, 0.3)'
		}
	}
];

// Función para cargar temas desbloqueados desde localStorage
function loadUnlockedThemes() {
	if (typeof window === 'undefined') return availableThemes;

	const unlockedThemesStr = localStorage.getItem('unlockedThemes');
	if (!unlockedThemesStr) return availableThemes;

	try {
		const unlockedThemeIds = JSON.parse(unlockedThemesStr) as string[];
		return availableThemes.map(theme => ({
			...theme,
			unlocked: theme.unlocked || unlockedThemeIds.includes(theme.id)
		}));
	} catch (e) {
		console.error('Error al cargar temas desbloqueados:', e);
		return availableThemes;
	}
}

// Función para obtener el tema inicial
function getInitialThemeId(): string {
	if (typeof window === 'undefined') return 'default-dark';

	// Verificar si el usuario ya ha elegido un tema
	const savedThemeId = localStorage.getItem('activeThemeId');
	if (savedThemeId) {
		// Verificar que el tema guardado existe y está desbloqueado
		const themes = loadUnlockedThemes();
		const savedTheme = themes.find(t => t.id === savedThemeId);
		if (savedTheme && savedTheme.unlocked) return savedThemeId;
	}

	// Si no, usar la preferencia del sistema (claro u oscuro)
	return window.matchMedia('(prefers-color-scheme: light)').matches
		? 'default-light'
		: 'default-dark';
}

// Store para los temas disponibles
export const themes = writable<Theme[]>(loadUnlockedThemes());

// Store para el ID del tema activo
export const activeThemeId = writable<string>(getInitialThemeId());

// Store derivado para el tema activo completo
export const activeTheme = derived(
	[themes, activeThemeId],
	([$themes, $activeThemeId]) => {
		return $themes.find(t => t.id === $activeThemeId) || $themes[0];
	}
);

// Función para cambiar el tema activo
export function setTheme(themeId: string): void {
	activeThemeId.update(currentId => {
		if (typeof window !== 'undefined') {
			// Guardar preferencia en localStorage
			localStorage.setItem('activeThemeId', themeId);
		}
		return themeId;
	});
}

// Función para desbloquear un tema con pomodoros
export function unlockTheme(themeId: string): boolean {
	let success = false;

	themes.update(currentThemes => {
		const themeToUnlock = currentThemes.find(t => t.id === themeId);
		if (!themeToUnlock || themeToUnlock.unlocked) return currentThemes;

		const currentPomodoros = get(pomodoroCount);

		if (currentPomodoros >= themeToUnlock.price) {
			// Tenemos suficientes pomodoros para desbloquear
			success = true;

			// Actualizar el array de temas desbloqueados en localStorage
			if (typeof window !== 'undefined') {
				const unlockedThemesStr = localStorage.getItem('unlockedThemes');
				let unlockedThemes: string[] = [];

				try {
					unlockedThemes = unlockedThemesStr ? JSON.parse(unlockedThemesStr) : [];
				} catch (e) {
					console.error('Error al parsear temas desbloqueados:', e);
				}

				unlockedThemes.push(themeId);
				localStorage.setItem('unlockedThemes', JSON.stringify(unlockedThemes));
			}

			// Actualizar el estado de temas
			return currentThemes.map(t =>
				t.id === themeId
					? { ...t, unlocked: true }
					: t
			);
		}

		return currentThemes;
	});

	return success;
}

// Inicializar el tema si estamos en el navegador
if (typeof window !== 'undefined') {
	activeTheme.subscribe(theme => {
		if (!theme) return;

		// Aplicar las propiedades CSS del tema
		Object.entries(theme.cssProperties).forEach(([property, value]) => {
			document.documentElement.style.setProperty(property, value);
		});
	});
}

