import type { AlarmSoundId } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
	if (!audioCtx) {
		const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		audioCtx = new AudioContextClass();
	}
	if (audioCtx.state === 'suspended') {
		audioCtx.resume();
	}
	return audioCtx;
}

/**
 * Play a synthesized alarm sound using the Web Audio API with zero latency
 */
export function playAlarmSound(soundId: AlarmSoundId = 'bell', volume = 0.7): void {
	if (typeof window === 'undefined') return;

	try {
		const ctx = getAudioContext();
		const now = ctx.currentTime;
		const masterGain = ctx.createGain();
		masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
		masterGain.connect(ctx.destination);

		switch (soundId) {
			case 'bell': {
				// Gentle crystal bell with overtones
				const freqs = [880, 1760, 2640, 3520];
				const weights = [1, 0.4, 0.2, 0.1];
				freqs.forEach((freq, i) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = 'sine';
					osc.frequency.setValueAtTime(freq, now);
					
					gain.gain.setValueAtTime(weights[i] * 0.5, now);
					gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
					
					osc.connect(gain);
					gain.connect(masterGain);
					osc.start(now);
					osc.stop(now + 2.5);
				});

				// Second bell strike after 0.4s
				freqs.forEach((freq, i) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = 'sine';
					osc.frequency.setValueAtTime(freq * 1.25, now + 0.35); // Major third higher
					
					gain.gain.setValueAtTime(weights[i] * 0.6, now + 0.35);
					gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
					
					osc.connect(gain);
					gain.connect(masterGain);
					osc.start(now + 0.35);
					osc.stop(now + 3.0);
				});
				break;
			}

			case 'chime': {
				// Modern melodic 3-note ascending chime (E5 -> G#5 -> B5)
				const notes = [659.25, 830.61, 987.77, 1318.51];
				notes.forEach((freq, idx) => {
					const startTime = now + idx * 0.18;
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = 'triangle';
					osc.frequency.setValueAtTime(freq, startTime);
					
					gain.gain.setValueAtTime(0.5, startTime);
					gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);
					
					osc.connect(gain);
					gain.connect(masterGain);
					osc.start(startTime);
					osc.stop(startTime + 1.2);
				});
				break;
			}

			case 'digital': {
				// Digital watch beep pattern (2 bursts)
				for (let burst = 0; burst < 2; burst++) {
					for (let beep = 0; beep < 3; beep++) {
						const startTime = now + burst * 0.45 + beep * 0.1;
						const osc = ctx.createOscillator();
						const gain = ctx.createGain();
						osc.type = 'square';
						osc.frequency.setValueAtTime(1046.5, startTime); // C6
						
						gain.gain.setValueAtTime(0.2, startTime);
						gain.gain.setValueAtTime(0.001, startTime + 0.06);
						
						osc.connect(gain);
						gain.connect(masterGain);
						osc.start(startTime);
						osc.stop(startTime + 0.06);
					}
				}
				break;
			}

			case 'gong': {
				// Deep resonant meditation gong / singing bowl
				const baseFreq = 196; // G3
				const harmonics = [1, 2.76, 5.4, 8.9];
				harmonics.forEach((mult, i) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = i === 0 ? 'sine' : 'triangle';
					osc.frequency.setValueAtTime(baseFreq * mult, now);
					
					const initialGain = (1 / (i + 1)) * 0.6;
					gain.gain.setValueAtTime(initialGain, now);
					gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
					
					osc.connect(gain);
					gain.connect(masterGain);
					osc.start(now);
					osc.stop(now + 4.0);
				});
				break;
			}

			case 'marimba': {
				// Cheerful wooden marimba melody (C5 -> E5 -> G5 -> C6)
				const melody = [523.25, 659.25, 783.99, 1046.50];
				melody.forEach((freq, idx) => {
					const startTime = now + idx * 0.12;
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = 'sine';
					osc.frequency.setValueAtTime(freq, startTime);
					
					// Fast attack, natural marimba decay
					gain.gain.setValueAtTime(0.6, startTime);
					gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
					
					osc.connect(gain);
					gain.connect(masterGain);
					osc.start(startTime);
					osc.stop(startTime + 0.6);
				});
				break;
			}

			case 'retro': {
				// 8-bit game level up arpeggio
				const notes = [440, 554.37, 659.25, 880];
				notes.forEach((freq, idx) => {
					const startTime = now + idx * 0.08;
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = 'square';
					osc.frequency.setValueAtTime(freq, startTime);
					
					gain.gain.setValueAtTime(0.2, startTime);
					gain.gain.setValueAtTime(0.001, startTime + 0.15);
					
					osc.connect(gain);
					gain.connect(masterGain);
					osc.start(startTime);
					osc.stop(startTime + 0.15);
				});
				break;
			}

			case 'classic':
			default: {
				// Classic alarm sound via Audio element or fallback synthesized ring
				const audio = new Audio('/sounds/alarm.wav');
				audio.volume = Math.max(0, Math.min(1, volume));
				audio.play().catch(() => {
					// Fallback to synthesized chime if wav fails
					playAlarmSound('bell', volume);
				});
				break;
			}
		}
	} catch (e) {
		console.warn('Audio synthesis failed, trying audio fallback:', e);
		try {
			const audio = new Audio('/sounds/alarm.wav');
			audio.volume = Math.max(0, Math.min(1, volume));
			audio.play();
		} catch (err) {
			console.error('Audio playback completely failed:', err);
		}
	}
}

/**
 * Play a very subtle mechanical tick for the countdown timer
 */
export function playTickSound(volume = 0.15): void {
	if (typeof window === 'undefined') return;
	try {
		const ctx = getAudioContext();
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		
		osc.type = 'sine';
		osc.frequency.setValueAtTime(1200, now);
		osc.frequency.exponentialRampToValueAtTime(400, now + 0.015);
		
		gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.2)), now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
		
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.015);
	} catch (e) {
		// Ignore tick errors
	}
}
