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
		id: 'midnight-purple',
		name: 'Púrpura Medianoche',
		description: 'Elegante tema púrpura oscuro para una concentración profunda en ambientes nocturnos.',
		previewColor: '#2E1A47',
		price: 25,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#2E1A47',
			'--bg-secondary': '#1E0F2E',
			'--bg-tertiary': '#3E2860',
			'--text-primary': '#E6D7FF',
			'--text-secondary': '#B79FE0',
			'--accent-color': '#9D4EDD',
			'--button-bg': '#3E2860',
			'--button-hover': '#4F3575',
			'--card-bg': 'rgba(255, 255, 255, 0.08)',
			'--border-color': 'rgba(255, 255, 255, 0.12)',
			'--shadow-color': 'rgba(0, 0, 0, 0.35)'
		}
	},
	{
		id: 'coffee-break',
		name: 'Pausa Café',
		description: 'Cálidos tonos café y crema para una productividad acogedora y relajada.',
		previewColor: '#4A3B2F',
		price: 15,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#4A3B2F',
			'--bg-secondary': '#3A2E25',
			'--bg-tertiary': '#5A493C',
			'--text-primary': '#F2E9D8',
			'--text-secondary': '#D9C5A9',
			'--accent-color': '#BF8756',
			'--button-bg': '#5A493C',
			'--button-hover': '#6A594C',
			'--card-bg': 'rgba(242, 233, 216, 0.1)',
			'--border-color': 'rgba(242, 233, 216, 0.15)',
			'--shadow-color': 'rgba(0, 0, 0, 0.25)'
		}
	},
	{
		id: 'cyber-neon',
		name: 'Neón Cibernético',
		description: 'Futurista tema con colores neón brillantes sobre fondo oscuro para sesiones nocturnas energizantes.',
		previewColor: '#0D0D15',
		price: 30,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#0D0D15',
			'--bg-secondary': '#08080E',
			'--bg-tertiary': '#15152A',
			'--text-primary': '#F0F8FF',
			'--text-secondary': '#C0D8FF',
			'--accent-color': '#00F5FF',
			'--button-bg': '#15152A',
			'--button-hover': '#1E1E3A',
			'--card-bg': 'rgba(0, 245, 255, 0.05)',
			'--border-color': 'rgba(0, 245, 255, 0.2)',
			'--shadow-color': 'rgba(0, 245, 255, 0.15)'
		}
	},

	{
		id: 'golden-desert',
		name: 'Desierto Dorado',
		description: 'Inspirado en las dunas doradas y atardeceres del desierto para un ambiente cálido y acogedor.',
		previewColor: '#B8860B',
		price: 20,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#B8860B',
			'--bg-secondary': '#996D09',
			'--bg-tertiary': '#D9A11D',
			'--text-primary': '#FFF8E8',
			'--text-secondary': '#FFE9B8',
			'--accent-color': '#FF8C00',
			'--button-bg': '#D9A11D',
			'--button-hover': '#EDAF1E',
			'--card-bg': 'rgba(255, 248, 232, 0.15)',
			'--border-color': 'rgba(255, 248, 232, 0.2)',
			'--shadow-color': 'rgba(0, 0, 0, 0.15)'
		}
	},
	{
		id: 'arctic-frost',
		name: 'Escarcha Ártica',
		description: 'Tonos fríos de azul y blanco que evocan la calma y claridad de un paisaje helado.',
		previewColor: '#D6EAF8',
		price: 17,
		unlocked: false,
		cssProperties: {
			'--bg-primary': '#D6EAF8',
			'--bg-secondary': '#E5F1F8',
			'--bg-tertiary': '#BED8F0',
			'--text-primary': '#1A5276',
			'--text-secondary': '#2874A6',
			'--accent-color': '#3498DB',
			'--button-bg': '#BED8F0',
			'--button-hover': '#A5C6E8',
			'--card-bg': 'rgba(26, 82, 118, 0.08)',
			'--border-color': 'rgba(26, 82, 118, 0.15)',
			'--shadow-color': 'rgba(0, 0, 0, 0.1)'
		}
	},
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

