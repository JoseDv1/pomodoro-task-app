<script lang="ts">
	import { pomodoroCount } from "../stores/timer";

	let { onclick }: { onclick?: () => void } = $props();
</script>

<button
	class="pomodoro-counter-badge"
	{onclick}
	title="Tomates completados acumulados"
	aria-label="Contador de Pomodoros"
>
	<img src="/imgs/icons/tomato.png" alt="Pomodoro" class="counter-img" />
	<span class="counter-num">{$pomodoroCount}</span>
</button>

<style>
	.pomodoro-counter-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		background-color: var(--badge-bg);
		border: 1px solid var(--accent-color);
		padding: 0.4rem 0.8rem;
		border-radius: 50px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pomodoro-counter-badge:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--shadow-color);
	}

	.counter-img {
		width: 20px;
		height: 20px;
	}

	.counter-num {
		font-weight: 800;
		font-size: 0.95rem;
		color: var(--accent-color);
	}
</style>
