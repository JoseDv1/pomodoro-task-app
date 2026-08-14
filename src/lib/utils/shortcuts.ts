import { toggleTimer, skipTimer, resetTimer } from '../stores/timer';

export type ShortcutAction = 'toggleTimer' | 'skipTimer' | 'resetTimer' | 'focusNewTask' | 'openShortcuts' | 'closeModals';

export function setupKeyboardShortcuts(callbacks: {
	onOpenShortcuts?: () => void;
	onCloseModals?: () => void;
	onFocusNewTask?: () => void;
}): () => void {
	if (typeof window === 'undefined') return () => {};

	function handleKeyDown(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		const isInputActive =
			target &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable);

		if (e.key === 'Escape') {
			if (callbacks.onCloseModals) {
				callbacks.onCloseModals();
			}
			return;
		}

		if (isInputActive) return;

		if (e.code === 'Space') {
			e.preventDefault();
			toggleTimer();
		} else if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
			e.preventDefault();
			skipTimer();
		} else if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
			e.preventDefault();
			resetTimer();
		} else if (e.shiftKey && (e.key === 'N' || e.key === 'n')) {
			e.preventDefault();
			if (callbacks.onFocusNewTask) {
				callbacks.onFocusNewTask();
			}
		} else if (e.key === '?') {
			e.preventDefault();
			if (callbacks.onOpenShortcuts) {
				callbacks.onOpenShortcuts();
			}
		}
	}

	window.addEventListener('keydown', handleKeyDown);
	return () => window.removeEventListener('keydown', handleKeyDown);
}
