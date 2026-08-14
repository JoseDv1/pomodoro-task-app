import type { AmbientSoundId } from '../types';

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioNode | null = null;
let masterGain: GainNode | null = null;
let currentAmbientType: AmbientSoundId = 'off';

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

function createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
	const bufferSize = ctx.sampleRate * 5; // 5 seconds looped buffer
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);

	if (type === 'white') {
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
	} else if (type === 'pink') {
		let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			b0 = 0.99886 * b0 + white * 0.0555179;
			b1 = 0.99332 * b1 + white * 0.0750759;
			b2 = 0.96900 * b2 + white * 0.1538520;
			b3 = 0.86650 * b3 + white * 0.3104856;
			b4 = 0.55000 * b4 + white * 0.5329522;
			b5 = -0.7616 * b5 - white * 0.0168980;
			data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
			b6 = white * 0.115926;
		}
	} else if (type === 'brown') {
		let lastOut = 0.0;
		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			data[i] = (lastOut + (0.02 * white)) / 1.02;
			lastOut = data[i];
			data[i] *= 3.5; // Gain compensation
		}
	}

	return buffer;
}

export function setAmbientSound(type: AmbientSoundId, volume = 0.3): void {
	if (typeof window === 'undefined') return;

	stopAmbientSound();

	if (type === 'off') {
		currentAmbientType = 'off';
		return;
	}

	try {
		const ctx = getAudioContext();
		masterGain = ctx.createGain();
		masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.5)), ctx.currentTime);
		masterGain.connect(ctx.destination);

		if (type === 'whitenoise') {
			const buffer = createNoiseBuffer(ctx, 'white');
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;

			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.setValueAtTime(3000, ctx.currentTime);

			source.connect(filter);
			filter.connect(masterGain);
			source.start();
			currentSourceNode = source;
		} else if (type === 'brownnoise') {
			const buffer = createNoiseBuffer(ctx, 'brown');
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;

			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.setValueAtTime(800, ctx.currentTime);

			source.connect(filter);
			filter.connect(masterGain);
			source.start();
			currentSourceNode = source;
		} else if (type === 'rain') {
			const buffer = createNoiseBuffer(ctx, 'pink');
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;

			const filter = ctx.createBiquadFilter();
			filter.type = 'bandpass';
			filter.frequency.setValueAtTime(1200, ctx.currentTime);
			filter.Q.setValueAtTime(0.5, ctx.currentTime);

			// Rain droplet high frequency
			const highFilter = ctx.createBiquadFilter();
			highFilter.type = 'highpass';
			highFilter.frequency.setValueAtTime(400, ctx.currentTime);

			source.connect(filter);
			filter.connect(highFilter);
			highFilter.connect(masterGain);
			source.start();
			currentSourceNode = source;
		} else if (type === 'stream') {
			const buffer = createNoiseBuffer(ctx, 'pink');
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;

			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.setValueAtTime(900, ctx.currentTime);

			source.connect(filter);
			filter.connect(masterGain);
			source.start();
			currentSourceNode = source;
		}

		currentAmbientType = type;
	} catch (e) {
		console.error('Failed to start ambient sound:', e);
		currentAmbientType = 'off';
	}
}

export function updateAmbientVolume(volume: number): void {
	if (masterGain && audioCtx) {
		masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.5)), audioCtx.currentTime);
	}
}

export function stopAmbientSound(): void {
	if (currentSourceNode) {
		try {
			(currentSourceNode as AudioBufferSourceNode).stop();
			currentSourceNode.disconnect();
		} catch (e) {
			// ignore
		}
		currentSourceNode = null;
	}
	if (masterGain) {
		try {
			masterGain.disconnect();
		} catch (e) {
			// ignore
		}
		masterGain = null;
	}
	currentAmbientType = 'off';
}

export function getCurrentAmbientSound(): AmbientSoundId {
	return currentAmbientType;
}
