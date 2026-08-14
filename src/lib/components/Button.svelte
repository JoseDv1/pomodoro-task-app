<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		onclick,
		children,
		icon,
		variant = "primary",
		type = "button",
		title,
		disabled = false,
	}: {
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
		icon?: string;
		variant?: "primary" | "secondary" | "danger";
		type?: "button" | "submit" | "reset";
		title?: string;
		disabled?: boolean;
	} = $props();
</script>

<button
	{type}
	{onclick}
	class="custom-btn {variant}"
	{title}
	{disabled}
>
	{#if icon}
		<span class="btn-icon">{@html icon}</span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.custom-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-icon {
		display: inline-flex;
		align-items: center;
	}

	.btn-icon :global(svg) {
		width: 18px;
		height: 18px;
		fill: currentColor;
	}

	.custom-btn.primary {
		background-color: var(--accent-color);
		border: 1px solid var(--accent-color);
		color: #ffffff;
	}

	.custom-btn.primary:hover {
		background-color: var(--accent-hover);
		border-color: var(--accent-hover);
		transform: translateY(-2px);
		box-shadow: 0 4px 14px rgba(255, 99, 71, 0.3);
	}

	.custom-btn.secondary {
		background-color: var(--button-bg);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
	}

	.custom-btn.secondary:hover {
		background-color: var(--button-hover);
		border-color: var(--accent-color);
		transform: translateY(-1px);
	}

	.custom-btn.danger {
		background-color: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.custom-btn.danger:hover {
		background-color: #ef4444;
		color: #ffffff;
		border-color: #ef4444;
	}
</style>
