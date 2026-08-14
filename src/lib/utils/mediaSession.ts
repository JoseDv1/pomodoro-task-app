import type { TimerMode } from '../types';

let silentAudioElement: HTMLAudioElement | null = null;

function getSilentAudio(): HTMLAudioElement | null {
	if (typeof window === 'undefined') return null;
	if (!silentAudioElement) {
		// A silent 1-second WAV data URI loop to hold audio focus and keep MediaSession active
		silentAudioElement = new Audio(
			'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
		);
		silentAudioElement.loop = true;
	}
	return silentAudioElement;
}

export function updateMediaSession(params: {
	title: string;
	mode: TimerMode;
	timeDisplay: string;
	isRunning: boolean;
	onPlay: () => void;
	onPause: () => void;
	onNext: () => void;
}): void {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

	try {
		const isWork = params.mode === 'work';
		const modeText = isWork ? 'Enfoque' : 'Descanso';

		navigator.mediaSession.metadata = new MediaMetadata({
			title: `${isWork ? '🍅' : '☕'} ${params.timeDisplay} - ${modeText}`,
			artist: 'Pomodoro Task App',
			album: params.title || 'Sesión de Productividad',
			artwork: [
				{
					src: '/imgs/icons/tomato.png',
					sizes: '512x512',
					type: 'image/png',
				},
				{
					src: '/imgs/icons/maskable_icon.png',
					sizes: '512x512',
					type: 'image/png',
				},
			],
		});

		navigator.mediaSession.setActionHandler('play', () => {
			params.onPlay();
		});

		navigator.mediaSession.setActionHandler('pause', () => {
			params.onPause();
		});

		navigator.mediaSession.setActionHandler('nexttrack', () => {
			params.onNext();
		});

		navigator.mediaSession.playbackState = params.isRunning ? 'playing' : 'paused';

		const audio = getSilentAudio();
		if (audio) {
			if (params.isRunning) {
				audio.play().catch(() => {});
			} else {
				audio.pause();
			}
		}
	} catch (err) {
		// Ignore unsupported mediaSession actions
	}
}

export function clearMediaSession(): void {
	if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
		navigator.mediaSession.playbackState = 'none';
	}
	if (silentAudioElement) {
		silentAudioElement.pause();
	}
}
