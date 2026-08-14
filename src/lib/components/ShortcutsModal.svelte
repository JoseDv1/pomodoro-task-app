<script lang="ts">
	let {
		isOpen,
		onClose,
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	const shortcuts = [
		{ key: "Espacio", desc: "Iniciar / Pausar el temporizador" },
		{ key: "Shift + S", desc: "Saltar a la siguiente sesión (Descanso o Enfoque)" },
		{ key: "Shift + R", desc: "Reiniciar el temporizador actual" },
		{ key: "Shift + N", desc: "Crear una nueva tarea rápidamente" },
		{ key: "?", desc: "Abrir esta guía de atajos" },
		{ key: "Escape", desc: "Cerrar cualquier ventana o modal activo" },
	];

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal-overlay"
		onclick={handleOverlayClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-modal-title"
		tabindex="-1"
	>
		<div class="modal-window shortcuts-window">
			<div class="modal-header">
				<h2 id="shortcuts-modal-title">
					<span>⌨️</span> Atajos de Teclado
				</h2>
				<button class="modal-close-btn" onclick={onClose} aria-label="Cerrar modal">
					✕
				</button>
			</div>

			<div class="shortcuts-list">
				{#each shortcuts as sc}
					<div class="shortcut-row">
						<span class="shortcut-desc">{sc.desc}</span>
						<kbd class="shortcut-kbd">{sc.key}</kbd>
					</div>
				{/each}
			</div>

			<div class="modal-footer">
				<button class="primary" onclick={onClose}>
					Entendido
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.shortcuts-window {
		max-width: 500px;
	}

	.shortcuts-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		gap: 1rem;
	}

	.shortcut-desc {
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.shortcut-kbd {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		box-shadow: 0 2px 0 var(--border-color);
		border-radius: 6px;
		padding: 0.25rem 0.6rem;
		font-size: 0.8rem;
		font-weight: 700;
		font-family: inherit;
		color: var(--accent-color);
		white-space: nowrap;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}
</style>
