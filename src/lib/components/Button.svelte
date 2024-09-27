<script lang="ts">
	import type { Snippet } from "svelte";

	let {onclick, children, icon}: {
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
		background-color: #f5f5f5;
		border: none;
		border-radius: 0.25rem;
		color: #333;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		justify-content: center;

		&:hover {
			background-color: #e0e0e0;
		}
	}


</style>