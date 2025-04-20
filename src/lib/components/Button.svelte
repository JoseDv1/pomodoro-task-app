<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		onclick,
		children,
		icon,
	}: {
		onclick: (e: Event) => void;
		children: Snippet;
		icon: string;
	} = $props();
</script>

<button {onclick}>
	{@html icon}
	{@render children()}
</button>

<style>
	button :global(svg) {
		margin-right: 0.5rem;
		fill: currentColor;
	}

	button {
		background-color: var(--accent-color);
		border: 1px solid var(--accent-color);
		border-radius: 0.25rem;
		color: white;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.25s ease;

		&:hover {
			background-color: var(--accent-color);
			opacity: 0.9;
			transform: translateY(-2px);
			box-shadow: 0 2px 8px var(--shadow-color);
		}
	}
</style>
