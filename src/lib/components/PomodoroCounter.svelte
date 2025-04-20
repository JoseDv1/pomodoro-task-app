<script lang="ts">
	import { pomodoroCount } from "../stores/timer";
</script>

<div class="pomodoro-counter">
	<img src="/imgs/icons/tomato.png" alt="Pomodoro" />
	<span>{$pomodoroCount}</span>
</div>

<style>
	.pomodoro-counter {
		position: fixed;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--card-bg);
		padding: 0.5rem;
		border-radius: 50px;
		box-shadow: 0 2px 5px var(--shadow-color);
		z-index: 1000;
		transition: all 0.3s ease;
	}

	img {
		width: 2rem;
		height: 2rem;
	}

	span {
		font-weight: bold;
		font-size: 1.2rem;
		color: var(--text-primary);
	}
</style>
