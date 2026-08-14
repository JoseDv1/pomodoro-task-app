<script lang="ts">
	import {
		tasks,
		filteredTasks,
		activeTaskId,
		taskFilter,
		taskSearch,
		taskStats,
		addTask,
		updateTask,
		toggleTask,
		removeTask,
		setActiveTask,
		clearCompletedTasks,
		clearAllTasks,
	} from "../stores/task";
	import type { TaskPriority, Task } from "../types";

	let newTaskName = $state("");
	let newEstimatedPomodoros = $state(1);
	let newPriority = $state<TaskPriority>("medium");
	let newCategory = $state("");
	let isAddingFormOpen = $state(false);

	let editingTaskId = $state<string | null>(null);
	let editingTaskName = $state("");

	function handleCreateTask(e: SubmitEvent) {
		e.preventDefault();
		if (!newTaskName.trim()) return;

		addTask({
			name: newTaskName,
			estimatedPomodoros: newEstimatedPomodoros,
			priority: newPriority,
			category: newCategory,
		});

		newTaskName = "";
		newEstimatedPomodoros = 1;
		newPriority = "medium";
		newCategory = "";
		isAddingFormOpen = false;
	}

	function startEditing(task: Task) {
		editingTaskId = task.id;
		editingTaskName = task.name;
	}

	function saveEditing(id: string) {
		if (editingTaskName.trim()) {
			updateTask(id, { name: editingTaskName.trim() });
		}
		editingTaskId = null;
	}

	function cancelEditing() {
		editingTaskId = null;
	}
</script>

<section class="tasklist-section glass-card">
	<!-- Task Header & Progress Overview -->
	<div class="task-header">
		<div class="task-title-group">
			<h2>Mis Tareas</h2>
			<span class="task-count-badge">{$taskStats.completed}/{$taskStats.total}</span>
		</div>

		<div class="task-summary-meta">
			<span title="Tomates completados / Estimados">
				🍅 {$taskStats.completedTotal}/{$taskStats.estimatedTotal}
			</span>
		</div>
	</div>

	<!-- Progress Bar -->
	{#if $taskStats.total > 0}
		<div class="task-progress-bar-bg" title="{$taskStats.progress}% completado">
			<div
				class="task-progress-bar-fill"
				style="width: {$taskStats.progress}%"
			></div>
		</div>
	{/if}

	<!-- Quick Filter & Search Bar -->
	<div class="task-toolbar">
		<div class="filter-pills" role="tablist">
			<button
				class="filter-pill {$taskFilter === 'all' ? 'active' : ''}"
				onclick={() => taskFilter.set("all")}
				role="tab"
				aria-selected={$taskFilter === "all"}
			>
				Todas ({$taskStats.total})
			</button>
			<button
				class="filter-pill {$taskFilter === 'active' ? 'active' : ''}"
				onclick={() => taskFilter.set("active")}
				role="tab"
				aria-selected={$taskFilter === "active"}
			>
				Pendientes ({$taskStats.active})
			</button>
			<button
				class="filter-pill {$taskFilter === 'completed' ? 'active' : ''}"
				onclick={() => taskFilter.set("completed")}
				role="tab"
				aria-selected={$taskFilter === "completed"}
			>
				Hechas ({$taskStats.completed})
			</button>
		</div>

		<div class="search-input-wrapper">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="search-icon"
			>
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
			<input
				type="text"
				placeholder="Buscar tareas..."
				bind:value={$taskSearch}
				class="task-search-input"
				aria-label="Buscar tareas"
			/>
			{#if $taskSearch}
				<button
					class="clear-search-btn"
					onclick={() => taskSearch.set("")}
					aria-label="Limpiar búsqueda"
				>
					✕
				</button>
			{/if}
		</div>
	</div>

	<!-- Add Task Trigger / Form -->
	{#if !isAddingFormOpen}
		<button
			class="add-task-trigger-btn"
			onclick={() => (isAddingFormOpen = true)}
		>
			<span class="plus-icon">+</span>
			<span>Añadir nueva tarea</span>
		</button>
	{:else}
		<form class="add-task-form" onsubmit={handleCreateTask}>
			<input
				type="text"
				placeholder="¿En qué vas a trabajar?"
				bind:value={newTaskName}
				class="task-name-input"
				required
			/>

			<div class="form-options-row">
				<!-- Pomodoro Estimate Selector -->
				<div class="option-field">
					<label for="task-est-select">Estimación:</label>
					<select
						id="task-est-select"
						bind:value={newEstimatedPomodoros}
						class="compact-select"
					>
						{#each [1, 2, 3, 4, 5, 6, 8, 10] as n}
							<option value={n}>{n} 🍅</option>
						{/each}
					</select>
				</div>

				<!-- Priority Selector -->
				<div class="option-field">
					<label for="task-prio-select">Prioridad:</label>
					<select
						id="task-prio-select"
						bind:value={newPriority}
						class="compact-select"
					>
						<option value="high">🔴 Alta</option>
						<option value="medium">🟡 Media</option>
						<option value="low">🟢 Baja</option>
					</select>
				</div>

				<!-- Category Input -->
				<div class="option-field category-field">
					<input
						type="text"
						placeholder="Categoría (opcional)"
						bind:value={newCategory}
						class="category-input"
					/>
				</div>
			</div>

			<div class="form-actions-row">
				<button
					type="button"
					class="cancel-btn"
					onclick={() => (isAddingFormOpen = false)}
				>
					Cancelar
				</button>
				<button type="submit" class="submit-btn primary">
					Guardar Tarea
				</button>
			</div>
		</form>
	{/if}

	<!-- Task List Items -->
	<ul class="task-list">
		{#each $filteredTasks as task (task.id)}
			<li
				class="task-item {task.completed ? 'completed' : ''} {$activeTaskId ===
				task.id
					? 'is-active-target'
					: ''}"
			>
				<div class="task-left">
					<!-- Checkbox -->
					<button
						class="custom-checkbox {task.completed ? 'checked' : ''}"
						onclick={() => toggleTask(task.id)}
						aria-label={task.completed
							? "Marcar como pendiente"
							: "Marcar como completada"}
					>
						{#if task.completed}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						{/if}
					</button>

					<!-- Active Task Target Selector -->
					<button
						class="active-star-btn {$activeTaskId === task.id ? 'active' : ''}"
						onclick={() =>
							setActiveTask($activeTaskId === task.id ? null : task.id)}
						title={$activeTaskId === task.id
							? "Tarea activa vinculada al temporizador"
							: "Vincular como tarea activa del temporizador"}
						aria-label="Vincular como tarea activa"
					>
						🎯
					</button>

					<!-- Content or Inline Editor -->
					<div class="task-body">
						{#if editingTaskId === task.id}
							<div class="inline-edit-box">
								<input
									type="text"
									bind:value={editingTaskName}
									class="inline-edit-input"
									onkeydown={(e) => {
										if (e.key === "Enter") saveEditing(task.id);
										if (e.key === "Escape") cancelEditing();
									}}
								/>
								<button
									class="save-inline-btn"
									onclick={() => saveEditing(task.id)}
								>
									✓
								</button>
								<button class="cancel-inline-btn" onclick={cancelEditing}>
									✕
								</button>
							</div>
						{:else}
							<div class="task-main-row">
								<span
									class="task-name"
									onclick={() => startEditing(task)}
									role="button"
									tabindex="0"
									onkeydown={(e) => e.key === "Enter" && startEditing(task)}
								>
									{task.name}
								</span>
							</div>

							<div class="task-badges-row">
								<!-- Priority Badge -->
								<span class="badge priority-badge {task.priority}">
									{task.priority === "high"
										? "Alta"
										: task.priority === "medium"
											? "Media"
											: "Baja"}
								</span>

								<!-- Category Badge -->
								{#if task.category}
									<span class="badge category-badge">
										#{task.category}
									</span>
								{/if}

								<!-- Pomodoro Counter Progress -->
								<span class="badge pomodoro-badge">
									🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
								</span>
							</div>
						{/if}
					</div>
				</div>

				<div class="task-actions">
					<button
						class="action-icon-btn edit-btn"
						onclick={() => startEditing(task)}
						title="Editar nombre"
						aria-label="Editar tarea"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
							></path>
						</svg>
					</button>

					<button
						class="action-icon-btn delete-btn"
						onclick={() => removeTask(task.id)}
						title="Eliminar tarea"
						aria-label="Eliminar tarea"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="3 6 5 6 21 6"></polyline>
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							></path>
						</svg>
					</button>
				</div>
			</li>
		{:else}
			<li class="empty-state">
				<div class="empty-icon">📝</div>
				<p class="empty-title">
					{$taskSearch
						? "No se encontraron tareas con esa búsqueda"
						: $taskFilter === "completed"
							? "No hay tareas completadas todavía"
							: "No tienes tareas pendientes"}
				</p>
				<span class="empty-desc"
					>Agrega una tarea para vincularla a tus sesiones de enfoque.</span
				>
			</li>
		{/each}
	</ul>

	<!-- Footer Batch Actions -->
	{#if $taskStats.total > 0}
		<div class="task-footer-actions">
			{#if $taskStats.completed > 0}
				<button
					class="secondary-btn small"
					onclick={clearCompletedTasks}
					title="Eliminar todas las tareas completadas"
				>
					Limpiar completadas ({$taskStats.completed})
				</button>
			{/if}
			<button
				class="secondary-btn small danger"
				onclick={() => {
					if (confirm("¿Estás seguro de que deseas eliminar todas las tareas?")) {
						clearAllTasks();
					}
				}}
				title="Eliminar toda la lista de tareas"
			>
				Vaciar lista
			</button>
		</div>
	{/if}
</section>

<style>
	.tasklist-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		text-align: left;
	}

	.task-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.task-title-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.task-title-group h2 {
		font-size: 1.35rem;
	}

	.task-count-badge {
		background: var(--bg-tertiary);
		padding: 0.15rem 0.55rem;
		border-radius: 50px;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.task-summary-meta {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--accent-color);
		background: var(--badge-bg);
		padding: 0.25rem 0.75rem;
		border-radius: 50px;
	}

	.task-progress-bar-bg {
		width: 100%;
		height: 6px;
		background: var(--bg-tertiary);
		border-radius: 3px;
		overflow: hidden;
	}

	.task-progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent-color), var(--accent-hover));
		border-radius: 3px;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.task-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.filter-pills {
		display: flex;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 50px;
		padding: 0.25rem;
		gap: 0.2rem;
	}

	.filter-pill {
		background: transparent;
		border: none;
		border-radius: 50px;
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		box-shadow: none;
	}

	.filter-pill:hover {
		color: var(--text-primary);
		transform: none;
		box-shadow: none;
	}

	.filter-pill.active {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: var(--text-secondary);
		pointer-events: none;
	}

	.task-search-input {
		width: 100%;
		padding-left: 2.2rem;
		padding-right: 2rem;
		font-size: 0.85rem;
		padding-top: 0.45rem;
		padding-bottom: 0.45rem;
		border-radius: 50px;
	}

	.clear-search-btn {
		position: absolute;
		right: 0.6rem;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0;
		font-size: 0.8rem;
		box-shadow: none;
	}

	.add-task-trigger-btn {
		width: 100%;
		border: 2px dashed var(--border-color);
		background: transparent;
		color: var(--text-secondary);
		padding: 0.75rem;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.add-task-trigger-btn:hover {
		border-color: var(--accent-color);
		color: var(--text-primary);
		background: var(--bg-secondary);
		transform: translateY(-1px);
	}

	.plus-icon {
		font-size: 1.2rem;
		color: var(--accent-color);
	}

	.add-task-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 14px;
		padding: 1rem;
		animation: fadeIn 0.2s ease;
	}

	.task-name-input {
		font-size: 1rem;
		font-weight: 600;
	}

	.form-options-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.option-field {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.compact-select {
		padding: 0.35rem 0.6rem;
		font-size: 0.82rem;
	}

	.category-field {
		flex: 1;
		min-width: 140px;
	}

	.category-input {
		width: 100%;
		padding: 0.35rem 0.6rem;
		font-size: 0.82rem;
	}

	.form-actions-row {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.25rem;
	}

	.task-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.task-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		gap: 0.75rem;
		transition: all 0.2s ease;
	}

	.task-item:hover {
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px var(--shadow-color);
	}

	.task-item.is-active-target {
		border-left: 4px solid var(--accent-color);
		background: linear-gradient(90deg, var(--badge-bg), var(--bg-secondary));
	}

	.task-item.completed {
		opacity: 0.65;
	}

	.task-item.completed .task-name {
		text-decoration: line-through;
		color: var(--text-secondary);
	}

	.task-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.custom-checkbox {
		width: 22px;
		height: 22px;
		min-width: 22px;
		border-radius: 6px;
		border: 2px solid var(--border-color);
		background: transparent;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #ffffff;
		box-shadow: none;
	}

	.custom-checkbox:hover {
		border-color: var(--accent-color);
		transform: none;
	}

	.custom-checkbox.checked {
		background: var(--accent-color);
		border-color: var(--accent-color);
	}

	.active-star-btn {
		background: transparent;
		border: none;
		padding: 0;
		font-size: 1.1rem;
		cursor: pointer;
		opacity: 0.35;
		transition: all 0.2s ease;
		box-shadow: none;
	}

	.active-star-btn:hover,
	.active-star-btn.active {
		opacity: 1;
		transform: scale(1.15);
		box-shadow: none;
	}

	.task-body {
		flex: 1;
		min-width: 0;
	}

	.task-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--text-primary);
		cursor: pointer;
		word-break: break-word;
	}

	.task-badges-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.3rem;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 50px;
	}

	.priority-badge.high {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.priority-badge.medium {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.priority-badge.low {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.category-badge {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.pomodoro-badge {
		background: var(--badge-bg);
		color: var(--accent-color);
	}

	.inline-edit-box {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.inline-edit-input {
		flex: 1;
		padding: 0.3rem 0.6rem;
		font-size: 0.9rem;
	}

	.save-inline-btn,
	.cancel-inline-btn {
		padding: 0.3rem 0.6rem;
		font-size: 0.8rem;
	}

	.task-actions {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.action-icon-btn {
		background: transparent;
		border: none;
		padding: 0.4rem;
		color: var(--text-secondary);
		border-radius: 6px;
		cursor: pointer;
		box-shadow: none;
	}

	.action-icon-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		transform: none;
		box-shadow: none;
	}

	.action-icon-btn.delete-btn:hover {
		color: #ef4444;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1rem;
		text-align: center;
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
		border-radius: 12px;
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.empty-title {
		font-weight: 700;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.empty-desc {
		font-size: 0.82rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.task-footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.5rem;
	}

	.secondary-btn.small {
		font-size: 0.8rem;
		padding: 0.4rem 0.8rem;
		background: var(--bg-secondary);
	}

	.secondary-btn.small.danger:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	@media (max-width: 560px) {
		.task-toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.filter-pills {
			width: 100%;
			justify-content: space-between;
		}

		.filter-pill {
			flex: 1;
			text-align: center;
			padding: 0.4rem 0.25rem;
			font-size: 0.76rem;
		}

		.form-options-row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
		}

		.category-field {
			grid-column: span 2;
		}

		.task-item {
			padding: 0.75rem 0.85rem;
		}

		.action-icon-btn {
			padding: 0.5rem;
			min-width: 36px;
			min-height: 36px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.custom-checkbox {
			width: 24px;
			height: 24px;
			min-width: 24px;
		}
	}
</style>
